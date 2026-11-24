import { Prisma, prisma, type ShipmentStatus } from "@onwei/database";
import { z } from "zod";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import {
  cancelIthinkParcel,
  findIthinkParcel,
  ithinkTrackingUrl,
  readIthinkConfig,
  trackIthinkParcels,
  type IthinkConfig,
  type IthinkParcel,
} from "./ithinkClient";
import {
  applyCourierUpdate,
  bookClaimedParcels,
  markShipmentBooked,
  type ClaimedParcel,
} from "./parcelBooking";
import { OPEN_SHIPMENT_STATUSES } from "./shipmentStatus";

/**
 * Insider cards through iThink Logistics (docs/COMMERCE_BUILD_PLAN.md
 * section 19). Staff send cards from admin Insiders > Ship cards, the team
 * prints labels in the iThink portal, and "Update all" reads courier status
 * back. A card is "posted" once the courier picks it up.
 */

const SINGLETON_ID = "singleton";
/** Max parcels per Add Order call (iThink's limit). */
export const CARD_SEND_BATCH = 10;
/** A send with no saved reply this long is shown as needing a look. */
const STALE_SENDING_MS = 5 * 60_000;
/** Statuses after which a card can be sent again. */
const RESENDABLE: ShipmentStatus[] = [
  "CANCELLED",
  "FAILED",
  "RETURNED",
  "LOST",
];

export interface IthinkDeps {
  config?: IthinkConfig | null;
  fetchImpl?: typeof fetch;
  now?: Date;
}

function depsOf(deps: IthinkDeps) {
  return {
    config: deps.config === undefined ? readIthinkConfig() : deps.config,
    fetchImpl: deps.fetchImpl ?? fetch,
    now: deps.now ?? new Date(),
  };
}

// ---------------------------------------------------------------------------
// Envelope settings
// ---------------------------------------------------------------------------

export interface CardParcelSettings {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  declaredValue: number;
}

export const CARD_PARCEL_DEFAULTS: CardParcelSettings = {
  lengthCm: 20.3,
  widthCm: 1,
  heightCm: 15.2,
  weightKg: 0.026,
  declaredValue: 1,
};

export const cardParcelSettingsSchema = z.object({
  lengthCm: z.number().min(1).max(100),
  widthCm: z.number().min(0.5).max(100),
  heightCm: z.number().min(1).max(100),
  weightKg: z.number().min(0.001).max(10),
  declaredValue: z.number().min(1).max(10_000),
});

export async function getCardParcelSettings(): Promise<CardParcelSettings> {
  const row = await prisma.insiderSetting.findUnique({
    where: { id: SINGLETON_ID },
    select: {
      cardLengthCm: true,
      cardWidthCm: true,
      cardHeightCm: true,
      cardWeightKg: true,
      cardDeclaredValue: true,
    },
  });
  if (!row) return { ...CARD_PARCEL_DEFAULTS };
  return {
    lengthCm: Number(row.cardLengthCm),
    widthCm: Number(row.cardWidthCm),
    heightCm: Number(row.cardHeightCm),
    weightKg: Number(row.cardWeightKg),
    declaredValue: Number(row.cardDeclaredValue),
  };
}

export async function updateCardParcelSettings(
  input: CardParcelSettings,
  actor: AuditActor,
): Promise<void> {
  const value = cardParcelSettingsSchema.parse(input);
  const before = await getCardParcelSettings();
  const data = {
    cardLengthCm: value.lengthCm,
    cardWidthCm: value.widthCm,
    cardHeightCm: value.heightCm,
    cardWeightKg: value.weightKg,
    cardDeclaredValue: value.declaredValue,
    updatedByStaffId: actor.staffUserId,
  };
  await prisma.$transaction(async (tx) => {
    await tx.insiderSetting.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.cardParcel.update",
        entityType: "InsiderSetting",
        entityId: SINGLETON_ID,
        beforeState: { ...before },
        afterState: { ...value },
      },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export const CARD_SHIP_VIEWS = ["ready", "sent", "problem", "noCard"] as const;
export type CardShipView = (typeof CARD_SHIP_VIEWS)[number];

const NO_ACTIVE_SHIPMENT = {
  none: { isCurrent: true, status: { not: "CANCELLED" as const } },
};

function viewWhere(
  view: CardShipView,
  now: Date,
): Prisma.InsiderCardAddressWhereInput {
  const staleBefore = new Date(now.getTime() - STALE_SENDING_MS);
  switch (view) {
    case "ready":
      return {
        postedAt: null,
        waitlistEntry: { printedCard: { isNot: null } },
        shipments: NO_ACTIVE_SHIPMENT,
      };
    case "noCard":
      return {
        postedAt: null,
        waitlistEntry: { printedCard: { is: null } },
        shipments: NO_ACTIVE_SHIPMENT,
      };
    case "problem":
      return {
        shipments: {
          some: {
            isCurrent: true,
            OR: [
              { status: { in: ["FAILED", "RETURNING", "RETURNED", "LOST"] } },
              { status: "BOOKED", addressChangedAt: { not: null } },
              { status: "SENDING", updatedAt: { lt: staleBefore } },
            ],
          },
        },
      };
    case "sent":
      return {
        OR: [
          {
            shipments: {
              some: {
                isCurrent: true,
                OR: [
                  { status: "BOOKED", addressChangedAt: null },
                  {
                    status: {
                      in: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
                    },
                  },
                  { status: "SENDING", updatedAt: { gte: staleBefore } },
                ],
              },
            },
          },
          // Posted by hand.
          { postedAt: { not: null }, shipments: NO_ACTIVE_SHIPMENT },
        ],
      };
  }
}

export interface CardShipmentView {
  id: string;
  reference: string;
  status: ShipmentStatus;
  awb: string | null;
  courier: string | null;
  courierStatus: string | null;
  trackingUrl: string | null;
  error: string | null;
  addressChangedAt: Date | null;
  bookedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  lastCheckedAt: Date | null;
  /** Sent, but no reply saved for a while: press "Check again". */
  unsure: boolean;
}

export interface CardShipRow {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  postedAt: Date | null;
  submittedAt: Date;
  insiderCode: string | null;
  cardNumber: number | null;
  shipment: CardShipmentView | null;
}

export async function countCardShipViews(
  now = new Date(),
): Promise<Record<CardShipView, number>> {
  const counts = await Promise.all(
    CARD_SHIP_VIEWS.map((view) =>
      prisma.insiderCardAddress.count({ where: viewWhere(view, now) }),
    ),
  );
  return Object.fromEntries(
    CARD_SHIP_VIEWS.map((view, i) => [view, counts[i] ?? 0]),
  ) as Record<CardShipView, number>;
}

export async function listCardShipRows(input: {
  view: CardShipView;
  page: number;
  pageSize: number;
  now?: Date;
}): Promise<{ rows: CardShipRow[]; hasNext: boolean }> {
  const now = input.now ?? new Date();
  const skip = (Math.max(input.page, 1) - 1) * input.pageSize;
  const rows = await prisma.insiderCardAddress.findMany({
    where: viewWhere(input.view, now),
    skip,
    take: input.pageSize + 1,
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    include: {
      waitlistEntry: {
        select: {
          insiderCode: true,
          printedCard: { select: { cardNumber: true } },
        },
      },
      shipments: { where: { isCurrent: true }, take: 1 },
    },
  });
  const staleBefore = now.getTime() - STALE_SENDING_MS;
  return {
    rows: rows.slice(0, input.pageSize).map((row) => {
      const s = row.shipments[0];
      return {
        id: row.id,
        fullName: row.fullName,
        phone: row.phone,
        line1: row.line1,
        line2: row.line2,
        city: row.city,
        state: row.state,
        postalCode: row.postalCode,
        postedAt: row.postedAt,
        submittedAt: row.submittedAt,
        insiderCode: row.waitlistEntry.insiderCode,
        cardNumber: row.waitlistEntry.printedCard?.cardNumber ?? null,
        shipment: s
          ? {
              id: s.id,
              reference: s.reference,
              status: s.status,
              awb: s.awb,
              courier: s.courier,
              courierStatus: s.courierStatus,
              trackingUrl: s.awb ? ithinkTrackingUrl(s.awb) : null,
              error: s.error,
              addressChangedAt: s.addressChangedAt,
              bookedAt: s.bookedAt,
              pickedUpAt: s.pickedUpAt,
              deliveredAt: s.deliveredAt,
              lastCheckedAt: s.lastCheckedAt,
              unsure:
                s.status === "SENDING" && s.updatedAt.getTime() < staleBefore,
            }
          : null,
      };
    }),
    hasNext: rows.length > input.pageSize,
  };
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/**
 * Our reference on iThink. The test server is one account shared by many
 * shops and keeps every reference forever, so test sends get a unique tail.
 */
export function cardReference(
  cardNumber: number,
  attempt: number,
  mode: IthinkConfig["mode"],
  unique: string,
): string {
  const number =
    cardNumber < 0
      ? `T${Math.abs(cardNumber)}`
      : String(cardNumber).padStart(4, "0");
  const base = `CARD-${number}${attempt > 1 ? `-${attempt}` : ""}`;
  return mode === "staging"
    ? `${base}-${unique.slice(-6).toUpperCase()}`
    : base;
}

export type SendCardsResult =
  | { ok: false; reason: "NOT_SET_UP" }
  | {
      ok: true;
      booked: number;
      failed: number;
      unsure: number;
      skipped: number;
      remaining: number;
      problems: { name: string; reason: string }[];
    };

/**
 * Sends up to 10 cards: the given addresses (ready, or ones that can be
 * sent again), or else the next ready ones, oldest first. A card already
 * on its way is skipped. A card whose last send got no reply is sent again
 * with the same reference, which iThink never books twice.
 */
export async function sendInsiderCards(
  input: { addressIds?: string[]; max?: number },
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<SendCardsResult> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ok: false, reason: "NOT_SET_UP" };
  const limit = Math.max(
    1,
    Math.min(input.max ?? CARD_SEND_BATCH, CARD_SEND_BATCH),
  );
  const settings = await getCardParcelSettings();

  const where: Prisma.InsiderCardAddressWhereInput = input.addressIds
    ? {
        id: { in: input.addressIds.slice(0, CARD_SEND_BATCH) },
        waitlistEntry: { printedCard: { isNot: null } },
      }
    : viewWhere("ready", now);
  const candidates = await prisma.insiderCardAddress.findMany({
    where,
    take: limit,
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    include: {
      waitlistEntry: {
        select: { printedCard: { select: { cardNumber: true } } },
      },
      shipments: { where: { isCurrent: true }, take: 1 },
    },
  });

  const claimed: ClaimedParcel[] = [];
  let skipped = 0;
  for (const row of candidates) {
    const cardNumber = row.waitlistEntry.printedCard?.cardNumber;
    const current = row.shipments[0];
    if (cardNumber === undefined) {
      skipped += 1;
      continue;
    }
    // Hand-posted with no shipment: nothing to send.
    if (!current && row.postedAt) {
      skipped += 1;
      continue;
    }
    const parcel = (reference: string): IthinkParcel => ({
      reference,
      orderDate: now,
      name: row.fullName,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      state: row.state,
      pin: row.postalCode,
      phone: row.phone,
      products: [
        {
          name: "Onwei Insider card",
          sku: "INSIDER-CARD",
          quantity: 1,
          price: settings.declaredValue,
        },
      ],
      totalAmount: settings.declaredValue,
      paymentMode: "Prepaid",
      lengthCm: settings.lengthCm,
      widthCm: settings.widthCm,
      heightCm: settings.heightCm,
      weightKg: settings.weightKg,
    });

    if (current?.status === "SENDING") {
      const touched = await prisma.shipment.updateMany({
        where: { id: current.id, status: "SENDING" },
        data: { error: null },
      });
      if (touched.count === 0) {
        skipped += 1;
        continue;
      }
      claimed.push({
        shipmentId: current.id,
        reference: current.reference,
        createdAt: current.createdAt,
        label: row.fullName,
        parcel: parcel(current.reference),
      });
      continue;
    }
    if (current && !RESENDABLE.includes(current.status)) {
      skipped += 1;
      continue;
    }

    try {
      const made = await prisma.$transaction(async (tx) => {
        const attempt =
          (await tx.shipment.count({
            where: { insiderCardAddressId: row.id },
          })) + 1;
        const reference = cardReference(
          cardNumber,
          attempt,
          config.mode,
          crypto.randomUUID().replace(/-/g, ""),
        );
        const off = await tx.shipment.updateMany({
          where: {
            insiderCardAddressId: row.id,
            isCurrent: true,
            status: { in: RESENDABLE },
          },
          data: { isCurrent: false },
        });
        // Someone else sent it in the meantime.
        if (current && off.count === 0) return null;
        const created = await tx.shipment.create({
          data: {
            kind: "INSIDER_CARD",
            insiderCardAddressId: row.id,
            reference,
            status: "SENDING",
            sentByStaffId: actor.staffUserId,
          },
        });
        // A card that came back or got lost goes out again, so it isn't
        // posted until the new parcel is picked up.
        if (row.postedAt) {
          await tx.insiderCardAddress.update({
            where: { id: row.id },
            data: { postedAt: null },
          });
        }
        await writeAuditLog(
          {
            staffUserId: actor.staffUserId,
            action: "insider.card.shipment.send",
            entityType: "Shipment",
            entityId: created.id,
            afterState: { reference, insiderCardAddressId: row.id, attempt },
          },
          tx,
        );
        return created;
      });
      if (!made) {
        skipped += 1;
        continue;
      }
      claimed.push({
        shipmentId: made.id,
        reference: made.reference,
        createdAt: made.createdAt,
        label: row.fullName,
        parcel: parcel(made.reference),
      });
    } catch (error) {
      // Two sends picked the same attempt number: the other one won.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  const { booked, failed, unsure, problems } = await bookClaimedParcels(
    config,
    claimed,
    fetchImpl,
    now,
  );

  const remaining = await prisma.insiderCardAddress.count({
    where: viewWhere("ready", new Date()),
  });
  return { ok: true, booked, failed, unsure, skipped, remaining, problems };
}

// ---------------------------------------------------------------------------
// Courier updates ("Update all")
// ---------------------------------------------------------------------------

export type RefreshCardsResult =
  | { ok: false; reason: "NOT_SET_UP" }
  | { ok: true; checked: number; changed: number; remaining: number };

/** Max sends with no reply looked up per round (each reads iThink's list). */
const UNSURE_PER_ROUND = 5;

function refreshWhere(startedAt: Date): Prisma.ShipmentWhereInput {
  return {
    kind: "INSIDER_CARD",
    isCurrent: true,
    AND: [
      {
        OR: [
          { status: { in: [...OPEN_SHIPMENT_STATUSES] }, awb: { not: null } },
          { status: "SENDING" },
        ],
      },
      { OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: startedAt } }] },
    ],
  };
}

/**
 * One round of "Update all": asks iThink about up to `max` cards not yet
 * checked since `startedAt`. The page calls it until `remaining` is 0.
 */
export async function refreshCardShipments(
  input: { startedAt: Date; max?: number },
  deps: IthinkDeps = {},
): Promise<RefreshCardsResult> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ok: false, reason: "NOT_SET_UP" };
  const max = Math.max(1, Math.min(input.max ?? 50, 100));
  const rows = await prisma.shipment.findMany({
    where: refreshWhere(input.startedAt),
    take: max,
    orderBy: [
      { lastCheckedAt: { sort: "asc", nulls: "first" } },
      { id: "asc" },
    ],
  });

  let changed = 0;
  const open = rows.filter((r) => r.status !== "SENDING" && r.awb);
  const sending = rows
    .filter((r) => r.status === "SENDING")
    .slice(0, UNSURE_PER_ROUND);
  const checkedIds = [...open, ...sending].map((r) => r.id);

  for (const row of sending) {
    const found = await findIthinkParcel(
      config,
      row.reference,
      row.createdAt,
      fetchImpl,
    );
    if (found) {
      await markShipmentBooked(row.id, found.awb, found.courier, now);
      changed += 1;
    }
  }

  const info = await trackIthinkParcels(
    config,
    open.map((r) => r.awb as string),
    fetchImpl,
  );
  for (const row of open) {
    const latest = info.get(row.awb as string);
    if (!latest) continue;
    const moved = await applyCourierUpdate(
      row,
      latest,
      now,
      async (tx, move) => {
        if (move.pickedUpAt && row.insiderCardAddressId) {
          await tx.insiderCardAddress.updateMany({
            where: { id: row.insiderCardAddressId, postedAt: null },
            data: { postedAt: move.pickedUpAt },
          });
        }
      },
    );
    if (moved) changed += 1;
  }

  if (checkedIds.length > 0) {
    await prisma.shipment.updateMany({
      where: { id: { in: checkedIds } },
      data: { lastCheckedAt: now },
    });
  }
  const remaining = await prisma.shipment.count({
    where: refreshWhere(input.startedAt),
  });
  return { ok: true, checked: checkedIds.length, changed, remaining };
}

// ---------------------------------------------------------------------------
// Cancel, keep, posted by hand
// ---------------------------------------------------------------------------

export type CancelCardResult =
  | { ok: true }
  | { ok: false; reason: "NOT_SET_UP" | "NOT_FOUND" | "NOT_CANCELLABLE" }
  | { ok: false; reason: "ITHINK"; message: string };

/** Cancels a booked card before the courier picks it up. */
export async function cancelCardShipment(
  addressId: string,
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<CancelCardResult> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ok: false, reason: "NOT_SET_UP" };
  const current = await prisma.shipment.findFirst({
    where: { insiderCardAddressId: addressId, isCurrent: true },
  });
  if (!current) return { ok: false, reason: "NOT_FOUND" };
  if (current.status !== "BOOKED" || !current.awb) {
    return { ok: false, reason: "NOT_CANCELLABLE" };
  }
  const result = await cancelIthinkParcel(config, current.awb, fetchImpl);
  if (!result.ok)
    return { ok: false, reason: "ITHINK", message: result.reason };
  await prisma.$transaction(async (tx) => {
    await tx.shipment.updateMany({
      where: { id: current.id, status: "BOOKED" },
      data: { status: "CANCELLED", cancelledAt: now, addressChangedAt: null },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.card.shipment.cancel",
        entityType: "Shipment",
        entityId: current.id,
        beforeState: { status: current.status, awb: current.awb },
        afterState: { status: "CANCELLED" },
      },
      tx,
    );
  });
  return { ok: true };
}

/** Staff checked the changed address and the booked parcel can stay. */
export async function keepCardShipment(
  addressId: string,
  actor: AuditActor,
): Promise<{ ok: boolean }> {
  const current = await prisma.shipment.findFirst({
    where: {
      insiderCardAddressId: addressId,
      isCurrent: true,
      addressChangedAt: { not: null },
    },
  });
  if (!current) return { ok: false };
  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: current.id },
      data: { addressChangedAt: null },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.card.shipment.keep",
        entityType: "Shipment",
        entityId: current.id,
      },
      tx,
    );
  });
  return { ok: true };
}

/**
 * Called when a member edits a saved address: a parcel not yet picked up
 * is flagged so staff can cancel it and send again.
 */
export async function flagCardAddressChanged(
  addressId: string,
  client: Pick<Prisma.TransactionClient, "shipment"> = prisma,
): Promise<void> {
  await client.shipment.updateMany({
    where: {
      insiderCardAddressId: addressId,
      isCurrent: true,
      status: { in: ["SENDING", "BOOKED"] },
    },
    data: { addressChangedAt: new Date() },
  });
}

/** Whether a card has a parcel in progress (so "posted by hand" is off). */
export async function hasActiveCardShipment(
  addressId: string,
): Promise<boolean> {
  const count = await prisma.shipment.count({
    where: {
      insiderCardAddressId: addressId,
      isCurrent: true,
      status: { notIn: RESENDABLE },
    },
  });
  return count > 0;
}
