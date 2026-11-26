import {
  Prisma,
  prisma,
  type Shipment,
  type ShipmentKind,
  type ShipmentStatus,
} from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { IthinkDeps } from "./cardShipments";
import {
  isDuplicateRemark,
  readIthinkConfig,
  trackIthinkParcels,
} from "./ithinkClient";

/**
 * "Add tracking numbers": staff paste tracking numbers from the iThink
 * portal and each one is matched to our parcel by the reference iThink
 * holds for it (Track Order returns it). For bookings whose reply was lost:
 * the live server's Order Details answers nothing, so we can't find them by
 * reference ourselves (docs/COMMERCE_BUILD_PLAN.md section 19).
 */

/** Most tracking numbers taken from one paste. */
export const TRACKING_PASTE_MAX = 100;

/**
 * Tracking numbers in pasted text: runs of 10 to 20 digits standing on
 * their own (not part of a reference like CARD-T1764...), so a copied
 * row of the iThink portal (dates, ₹1.00, 0.03 kg) works as well as a list.
 */
export function trackingNumbersIn(text: string): string[] {
  const found = text.match(/(?<![\w-])\d{10,20}(?![\w-])/g) ?? [];
  return [...new Set(found)].slice(0, TRACKING_PASTE_MAX);
}

/**
 * iThink already has this parcel (it refused a send as a duplicate) but we
 * have no tracking number for it. Never send it again as a new attempt:
 * that books a second parcel. Add its tracking number instead.
 */
export function needsTrackingNumber(shipment: {
  status: ShipmentStatus;
  error: string | null;
  awb: string | null;
}): boolean {
  return (
    (shipment.status === "SENDING" || shipment.status === "FAILED") &&
    !shipment.awb &&
    Boolean(shipment.error) &&
    isDuplicateRemark(shipment.error ?? "")
  );
}

export interface TrackingMatchLeft {
  awb: string;
  reason: string;
}

export type TrackingMatchResult =
  | { ok: false; reason: "NOT_SET_UP" | "NOTHING_PASTED" }
  | {
      ok: true;
      /** Saved: the parcel now shows as booked with this tracking number. */
      matched: { reference: string; awb: string }[];
      /** Already saved on the right parcel before this paste. */
      alreadySaved: number;
      /** Not matched, with why in plain words. */
      left: TrackingMatchLeft[];
    };

const OPEN_FOR_MATCH: ShipmentStatus[] = ["SENDING", "FAILED"];
const SWITCHABLE: ShipmentStatus[] = ["FAILED", "CANCELLED"];

function ownerWhere(s: Shipment): Prisma.ShipmentWhereInput | null {
  if (s.insiderCardAddressId)
    return { insiderCardAddressId: s.insiderCardAddressId };
  if (s.orderId) return { orderId: s.orderId };
  return null;
}

/**
 * Matches pasted tracking numbers to our parcels. Only parcels still
 * "sending" or "not sent" change; anything else is listed with a reason.
 * `scope` limits it to one card or one order (the per-row button).
 */
export async function matchTrackingNumbers(
  input: {
    text: string;
    kind?: ShipmentKind;
    insiderCardAddressId?: string;
    orderId?: string;
  },
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<TrackingMatchResult> {
  const config = deps.config === undefined ? readIthinkConfig() : deps.config;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? new Date();
  if (!config) return { ok: false, reason: "NOT_SET_UP" };
  const awbs = trackingNumbersIn(input.text);
  if (awbs.length === 0) return { ok: false, reason: "NOTHING_PASTED" };

  const scope: Prisma.ShipmentWhereInput = {
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.insiderCardAddressId
      ? { insiderCardAddressId: input.insiderCardAddressId }
      : {}),
    ...(input.orderId ? { orderId: input.orderId } : {}),
  };

  const saved = await prisma.shipment.findMany({
    where: { awb: { in: awbs } },
    select: { awb: true },
  });
  const savedAwbs = new Set(saved.map((s) => s.awb));
  const toAsk = awbs.filter((a) => !savedAwbs.has(a));
  const info = await trackIthinkParcels(config, toAsk, fetchImpl);

  const matched: { reference: string; awb: string }[] = [];
  const left: TrackingMatchLeft[] = [];

  for (const awb of toAsk) {
    const latest = info.get(awb);
    if (!latest) {
      left.push({
        awb,
        reason:
          "iThink doesn't know this tracking number. Check it was copied in full.",
      });
      continue;
    }
    if (!latest.reference) {
      left.push({
        awb,
        reason: "iThink didn't say which order this is.",
      });
      continue;
    }
    const shipment = await prisma.shipment.findFirst({
      where: {
        ...scope,
        reference: { equals: latest.reference, mode: "insensitive" },
      },
    });
    if (!shipment) {
      left.push({
        awb,
        reason: input.insiderCardAddressId
          ? `This tracking number is for ${latest.reference}, not this card.`
          : input.orderId
            ? `This tracking number is for ${latest.reference}, not this order.`
            : `This tracking number is for ${latest.reference}, which isn't one of ours.`,
      });
      continue;
    }
    if (shipment.awb) {
      left.push({
        awb,
        reason: `${shipment.reference} already has tracking number ${shipment.awb}. iThink may have it booked twice: check the portal.`,
      });
      continue;
    }
    if (!OPEN_FOR_MATCH.includes(shipment.status)) {
      left.push({
        awb,
        reason: `${shipment.reference} isn't waiting for a tracking number.`,
      });
      continue;
    }

    const owner = ownerWhere(shipment);
    const current =
      shipment.isCurrent || !owner
        ? shipment
        : await prisma.shipment.findFirst({
            where: { ...owner, isCurrent: true },
          });
    // An older try was booked after all. Take it only when the newest try
    // didn't go through; otherwise both are on iThink.
    if (current && current.id !== shipment.id) {
      const newestIsOut =
        SWITCHABLE.includes(current.status) && !needsTrackingNumber(current);
      if (!newestIsOut) {
        left.push({
          awb,
          reason: `${shipment.reference} and the newer ${current.reference} are both on iThink. Cancel one in the iThink portal before pickup.`,
        });
        continue;
      }
    }

    try {
      const done = await prisma.$transaction(async (tx) => {
        const moved = await tx.shipment.updateMany({
          where: { id: shipment.id, status: { in: OPEN_FOR_MATCH }, awb: null },
          data: {
            status: "BOOKED",
            awb,
            courier: latest.courier,
            bookedAt: now,
            error: null,
            isCurrent: true,
            lastCheckedAt: null,
          },
        });
        if (moved.count === 0) return false;
        if (current && current.id !== shipment.id) {
          await tx.shipment.updateMany({
            where: { id: current.id, status: { in: SWITCHABLE } },
            data: { isCurrent: false },
          });
        }
        await writeAuditLog(
          {
            staffUserId: actor.staffUserId,
            action: "shipment.trackingNumber.add",
            entityType: "Shipment",
            entityId: shipment.id,
            beforeState: { status: shipment.status, error: shipment.error },
            afterState: {
              status: "BOOKED",
              awb,
              reference: shipment.reference,
            },
          },
          tx,
        );
        return true;
      });
      if (done) {
        matched.push({ reference: shipment.reference, awb });
      } else {
        left.push({
          awb,
          reason: `${shipment.reference} changed while saving. Refresh and try again.`,
        });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        left.push({ awb, reason: "This tracking number is already saved." });
        continue;
      }
      throw error;
    }
  }

  return {
    ok: true,
    matched,
    alreadySaved: awbs.length - toAsk.length,
    left,
  };
}
