import {
  Prisma,
  prisma,
  type OrderStatus,
  type ShipmentStatus,
} from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import { createLazyLimiter } from "../rateLimit/lazyLimiter";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import type { AddressSnapshot } from "../commerce/orders";
import { getStoreSettings } from "../commerce/storeSettings";
import { canTransition } from "../orders/orderStateMachine";
import type { IthinkDeps } from "./cardShipments";
import {
  cancelIthinkParcel,
  checkIthinkPincode,
  findIthinkParcel,
  ithinkTrackingUrl,
  ndrIthinkAction,
  readIthinkConfig,
  trackIthinkParcels,
  type FailedDeliveryAction,
  type IthinkConfig,
  type IthinkParcel,
  type PincodeService,
} from "./ithinkClient";
import {
  ALREADY_IN_ITHINK,
  applyCourierUpdate,
  bookClaimedParcels,
  markShipmentBooked,
  type ShipmentMove,
} from "./parcelBooking";
import {
  OPEN_SHIPMENT_STATUSES,
  clearsFailedDelivery,
  isFailedDelivery,
  mapIthinkStatus,
} from "./shipmentStatus";
import { needsTrackingNumber } from "./trackingMatch";

/**
 * Orders through iThink Logistics (docs/COMMERCE_BUILD_PLAN.md section 19,
 * phase 2). An order goes to iThink when it's confirmed (paid online, or
 * placed with cash on delivery; a pre-order once its balance is paid). The
 * team prints the label in the iThink portal. Staff press "Get latest
 * update" (one order) or "Update all open shipments" (orders list) and the
 * order moves to Shipped, Out for delivery and Delivered.
 */

/** Order statuses that can be sent to iThink. */
const SENDABLE_ORDER: OrderStatus[] = ["CONFIRMED", "PACKED"];
/** Shipment statuses after which an order can be sent again. */
const RESENDABLE: ShipmentStatus[] = [
  "CANCELLED",
  "FAILED",
  "RETURNED",
  "LOST",
];
/** Who changed an order's status, in OrderStatusHistory. */
export const ITHINK_ACTOR = "ithink";

function depsOf(deps: IthinkDeps) {
  return {
    config: deps.config === undefined ? readIthinkConfig() : deps.config,
    fetchImpl: deps.fetchImpl ?? fetch,
    now: deps.now ?? new Date(),
  };
}

export function orderReference(
  orderNumber: string,
  attempt: number,
  mode: IthinkConfig["mode"],
  unique: string,
): string {
  const base = attempt > 1 ? `${orderNumber}-${attempt}` : orderNumber;
  return mode === "staging"
    ? `${base}-${unique.slice(-6).toUpperCase()}`
    : base;
}

const rupees = (value: Prisma.Decimal | number) => toMinorUnits(value) / 100;

/** A category's shipper box, in cm and grams. */
export interface ItemBox {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
}

/** The category box when all four parts are set, else null. */
export function shipperBoxOf(category: {
  boxLengthCm: Prisma.Decimal | number | null;
  boxWidthCm: Prisma.Decimal | number | null;
  boxHeightCm: Prisma.Decimal | number | null;
  boxWeightGrams: number | null;
}): ItemBox | null {
  const { boxLengthCm, boxWidthCm, boxHeightCm, boxWeightGrams } = category;
  if (
    boxLengthCm === null ||
    boxWidthCm === null ||
    boxHeightCm === null ||
    boxWeightGrams === null
  ) {
    return null;
  }
  return {
    lengthCm: Number(boxLengthCm),
    widthCm: Number(boxWidthCm),
    heightCm: Number(boxHeightCm),
    weightGrams: boxWeightGrams,
  };
}

/**
 * The parcel for an order: one shipper box per unit, stacked. Longest
 * length, widest width, heights added; weight is each unit plus its empty
 * box. A category with no box uses the Settings size (and no box weight); a
 * size with no weight uses the Settings weight per item.
 */
export function parcelSize(
  items: {
    quantity: number;
    weightGrams: number | null;
    box: ItemBox | null;
  }[],
  fallback: {
    parcelLengthCm: number;
    parcelWidthCm: number;
    parcelHeightCm: number;
    defaultItemWeightKg: number;
  },
): { lengthCm: number; widthCm: number; heightCm: number; weightKg: number } {
  let lengthCm = 0;
  let widthCm = 0;
  let heightCm = 0;
  let grams = 0;
  for (const item of items) {
    const box: ItemBox = item.box ?? {
      lengthCm: fallback.parcelLengthCm,
      widthCm: fallback.parcelWidthCm,
      heightCm: fallback.parcelHeightCm,
      weightGrams: 0,
    };
    const unitGrams = item.weightGrams ?? fallback.defaultItemWeightKg * 1000;
    lengthCm = Math.max(lengthCm, box.lengthCm);
    widthCm = Math.max(widthCm, box.widthCm);
    heightCm += box.heightCm * item.quantity;
    grams += (unitGrams + box.weightGrams) * item.quantity;
  }
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    lengthCm: round1(lengthCm || fallback.parcelLengthCm),
    widthCm: round1(widthCm || fallback.parcelWidthCm),
    heightCm: round1(heightCm || fallback.parcelHeightCm),
    weightKg: Math.max(Math.round(grams) / 1000, 0.05),
  };
}

/**
 * Items in an order whose parcel size or weight was estimated (no category
 * box, or no weight on the size), for a warning on the admin order page.
 */
export async function getOrderParcelGaps(orderId: string): Promise<string[]> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
    select: {
      productName: true,
      variantLabel: true,
      productVariant: {
        select: {
          weightGrams: true,
          product: {
            select: {
              category: {
                select: {
                  boxLengthCm: true,
                  boxWidthCm: true,
                  boxHeightCm: true,
                  boxWeightGrams: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return items
    .filter(
      (item) =>
        item.productVariant.weightGrams === null ||
        !shipperBoxOf(item.productVariant.product.category),
    )
    .map((item) =>
      item.variantLabel
        ? `${item.productName} (${item.variantLabel})`
        : item.productName,
    );
}

/** The order as iThink needs it. Exported for tests. */
export function buildOrderParcel(
  order: {
    orderNumber: string;
    placedAt: Date;
    paymentMethod: "RAZORPAY" | "COD";
    total: Prisma.Decimal | number;
    shippingTotal: Prisma.Decimal | number;
    codFee: Prisma.Decimal | number;
    contactEmail: string | null;
    contactPhone: string | null;
    shippingAddressSnapshot: unknown;
    items: {
      productName: string;
      variantLabel: string;
      sku: string;
      quantity: number;
      unitPrice: Prisma.Decimal | number;
      gstRate: Prisma.Decimal | number | null;
      hsnCode: string | null;
      weightGrams: number | null;
      /** The category's shipper box, or null to use the Settings one. */
      box: ItemBox | null;
    }[];
  },
  paidOnline: number,
  reference: string,
  box: {
    parcelLengthCm: number;
    parcelWidthCm: number;
    parcelHeightCm: number;
    defaultItemWeightKg: number;
  },
): IthinkParcel | null {
  const address = order.shippingAddressSnapshot as AddressSnapshot | null;
  if (!address) return null;
  const total = rupees(order.total);
  const shipping = rupees(order.shippingTotal);
  const codFee = rupees(order.codFee);
  const products = order.items.map((item) => ({
    name: item.variantLabel
      ? `${item.productName} (${item.variantLabel})`
      : item.productName,
    sku: item.sku,
    quantity: item.quantity,
    // iThink refuses 0, so free items go as ₹1 (balanced in the discount).
    price: Math.max(rupees(item.unitPrice), 1),
    taxRate: item.gstRate == null ? null : Number(item.gstRate),
    hsn: item.hsnCode,
  }));
  const listed = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  // Whatever brings the listed items, delivery and COD fee to the total.
  const discount = Math.max(
    0,
    Math.round((listed + shipping + codFee - total) * 100) / 100,
  );
  const due = Math.max(0, Math.round((total - paidOnline) * 100) / 100);
  const cod = order.paymentMethod === "COD" && due > 0;
  const size = parcelSize(order.items, box);
  return {
    reference,
    orderDate: order.placedAt,
    name: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    pin: address.postalCode,
    phone: address.phone || order.contactPhone || "",
    email: order.contactEmail ?? "",
    products,
    totalAmount: total,
    paymentMode: cod ? "COD" : "Prepaid",
    codAmount: cod ? due : 0,
    shippingCharges: shipping,
    codCharges: codFee,
    totalDiscount: discount,
    lengthCm: size.lengthCm,
    widthCm: size.widthCm,
    heightCm: size.heightCm,
    weightKg: size.weightKg,
  };
}

export type SendOrderResult =
  | {
      ok: false;
      reason:
        "NOT_SET_UP" | "NOT_FOUND" | "NOT_READY" | "ALREADY_SENT" | "BUSY";
    }
  | { ok: true; outcome: "BOOKED"; awb: string }
  | { ok: true; outcome: "FAILED" | "UNSURE"; message: string };

/**
 * Sends one order to iThink. Safe to call twice: an order already booked
 * is left alone, and one whose last send got no reply goes again with the
 * same reference (iThink never books a reference twice). `actor` is the
 * staff member for a manual send, null for the automatic send at checkout.
 */
export async function sendOrderToIthink(
  orderId: string,
  actor: AuditActor | null,
  deps: IthinkDeps = {},
): Promise<SendOrderResult> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ok: false, reason: "NOT_SET_UP" };
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          productVariant: {
            select: {
              weightGrams: true,
              product: {
                select: {
                  hsnCode: true,
                  category: {
                    select: {
                      boxLengthCm: true,
                      boxWidthCm: true,
                      boxHeightCm: true,
                      boxWeightGrams: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      payments: {
        where: { status: "SUCCESS" },
        select: { amount: true, provider: true },
      },
      shipments: { where: { isCurrent: true }, take: 1 },
    },
  });
  if (!order || order.deletedAt) return { ok: false, reason: "NOT_FOUND" };
  if (!SENDABLE_ORDER.includes(order.status)) {
    return { ok: false, reason: "NOT_READY" };
  }
  const current = order.shipments[0];
  if (
    current &&
    current.status !== "SENDING" &&
    !RESENDABLE.includes(current.status)
  ) {
    return { ok: false, reason: "ALREADY_SENT" };
  }

  // Refused as a duplicate: iThink has it booked. A new attempt would be a
  // second parcel, so wait for its tracking number instead.
  if (current && needsTrackingNumber(current)) {
    return { ok: true, outcome: "UNSURE", message: ALREADY_IN_ITHINK };
  }

  let shipmentId: string;
  let reference: string;
  let createdAt: Date;
  if (current?.status === "SENDING") {
    shipmentId = current.id;
    reference = current.reference;
    createdAt = current.createdAt;
  } else {
    try {
      const made = await prisma.$transaction(async (tx) => {
        const attempt = (await tx.shipment.count({ where: { orderId } })) + 1;
        const ref = orderReference(
          order.orderNumber,
          attempt,
          config.mode,
          crypto.randomUUID().replace(/-/g, ""),
        );
        const off = await tx.shipment.updateMany({
          where: { orderId, isCurrent: true, status: { in: RESENDABLE } },
          data: { isCurrent: false },
        });
        if (current && off.count === 0) return null;
        const created = await tx.shipment.create({
          data: {
            kind: "ORDER",
            orderId,
            reference: ref,
            status: "SENDING",
            sentByStaffId: actor?.staffUserId ?? null,
          },
        });
        if (actor) {
          await writeAuditLog(
            {
              staffUserId: actor.staffUserId,
              action: "order.shipment.send",
              entityType: "Shipment",
              entityId: created.id,
              afterState: { orderId, reference: ref, attempt },
            },
            tx,
          );
        }
        return created;
      });
      if (!made) return { ok: false, reason: "BUSY" };
      shipmentId = made.id;
      reference = made.reference;
      createdAt = made.createdAt;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, reason: "BUSY" };
      }
      throw error;
    }
  }

  const box = await getStoreSettings();
  const paidOnline = order.payments
    .filter((p) => p.provider !== "cod")
    .reduce((sum, p) => sum + rupees(p.amount), 0);
  const parcel = buildOrderParcel(
    {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        hsnCode: item.productVariant.product.hsnCode,
        weightGrams: item.productVariant.weightGrams,
        box: shipperBoxOf(item.productVariant.product.category),
      })),
    },
    paidOnline,
    reference,
    box,
  );
  if (!parcel) {
    const message =
      "This order has no delivery address saved, so it can't go to iThink.";
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: "FAILED", error: message },
    });
    return { ok: true, outcome: "FAILED", message };
  }

  const outcome = await bookClaimedParcels(
    config,
    [{ shipmentId, reference, createdAt, label: order.orderNumber, parcel }],
    fetchImpl,
    now,
  );
  const booked = outcome.bookedShipments[0];
  if (booked) return { ok: true, outcome: "BOOKED", awb: booked.awb };
  if (outcome.booked > 0) {
    const row = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    return { ok: true, outcome: "BOOKED", awb: row?.awb ?? "" };
  }
  const message = outcome.problems[0]?.reason ?? "iThink didn't take it.";
  return {
    ok: true,
    outcome: outcome.unsure > 0 ? "UNSURE" : "FAILED",
    message,
  };
}

// ---------------------------------------------------------------------------
// Courier updates
// ---------------------------------------------------------------------------

/** Forward order statuses a courier update can move through, in order. */
const ORDER_PATH: OrderStatus[] = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const SHIPMENT_TO_ORDER: Partial<Record<ShipmentStatus, OrderStatus>> = {
  IN_TRANSIT: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

const ATTENTION: Partial<Record<ShipmentStatus, string>> = {
  RETURNING:
    "The courier couldn't deliver this order and is sending it back to us. Contact the customer.",
  RETURNED:
    "This order came back to us undelivered. Contact the customer, then send it again or cancel and refund.",
  LOST: "iThink says the courier lost this parcel. Raise it with iThink and contact the customer.",
  CANCELLED:
    "The courier booking was cancelled in the iThink portal. Send it again from Delivery, or cancel the order.",
};

export type OrderEvent = { orderId: string; type: "SHIPPED" | "DELIVERED" };

/**
 * Moves an order along the courier's progress, one history row per step
 * (Confirmed > Shipped > Delivered when steps were skipped). Never moves an
 * order back, and leaves cancelled or returned orders alone.
 */
async function moveOrderWithCourier(
  tx: Prisma.TransactionClient,
  orderId: string,
  move: ShipmentMove,
  shipment: {
    awb: string | null;
    courier: string | null;
    courierStatus: string | null;
  },
): Promise<OrderEvent[]> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { status: true, needsAttention: true },
  });
  if (!order) return [];
  const note = ATTENTION[move.to];
  if (note) {
    if (
      !["CANCELLED", "REFUNDED"].includes(order.status) &&
      order.needsAttention !== note
    ) {
      await tx.order.update({
        where: { id: orderId },
        data: { needsAttention: note },
      });
    }
    return [];
  }
  const target = SHIPMENT_TO_ORDER[move.to];
  if (!target) return [];
  const from = ORDER_PATH.indexOf(order.status);
  const to = ORDER_PATH.indexOf(target);
  if (from < 0 || to <= from) return [];

  // Walk forward, taking the longest legal step each time.
  const steps: OrderStatus[] = [];
  let at = from;
  while (at < to) {
    let next = -1;
    for (let i = to; i > at; i -= 1) {
      if (canTransition(ORDER_PATH[at]!, ORDER_PATH[i]!)) {
        next = i;
        break;
      }
    }
    if (next < 0) return [];
    steps.push(ORDER_PATH[next]!);
    at = next;
  }

  const shipped = steps.includes("SHIPPED");
  const delivered = steps.includes("DELIVERED");
  const updated = await tx.order.updateMany({
    where: { id: orderId, status: order.status },
    data: {
      status: target,
      ...(shipped
        ? {
            shippedAt: move.pickedUpAt ?? move.at,
            trackingNumber: shipment.awb,
            courierName: shipment.courier,
          }
        : {}),
      ...(delivered ? { deliveredAt: move.deliveredAt ?? move.at } : {}),
    },
  });
  if (updated.count === 0) return [];
  for (const status of steps) {
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status,
        note: shipment.courierStatus
          ? `Courier: ${shipment.courierStatus}`
          : "Courier update",
        changedBy: ITHINK_ACTOR,
      },
    });
  }
  const events: OrderEvent[] = [];
  if (shipped) events.push({ orderId, type: "SHIPPED" });
  if (delivered) events.push({ orderId, type: "DELIVERED" });
  return events;
}

/** Start of the order note for a failed delivery (staff act on it). */
export const FAILED_DELIVERY_NOTE = "The courier couldn't deliver";

/**
 * Flags the order when the courier couldn't deliver, and clears that flag
 * once the parcel is out again or done. Other notes (coming back, lost) are
 * left alone.
 */
async function noteFailedDelivery(
  orderId: string,
  latest: {
    statusText: string;
    statusCode: string;
    reason: string | null;
    lastScanAt: Date | null;
  },
  /** Staff already chose for this attempt: don't flag it again. */
  actedAt: Date | null,
): Promise<void> {
  if (isFailedDelivery(latest.statusText)) {
    if (actedAt && (!latest.lastScanAt || latest.lastScanAt <= actedAt)) return;
    const reason = latest.reason?.trim();
    await prisma.order.updateMany({
      where: {
        id: orderId,
        status: { notIn: ["CANCELLED", "REFUNDED", "DELIVERED"] },
        OR: [
          { needsAttention: null },
          { needsAttention: { startsWith: FAILED_DELIVERY_NOTE } },
        ],
      },
      data: {
        needsAttention: `${FAILED_DELIVERY_NOTE}${reason ? ` (${reason})` : ""}. Choose "Try again" or "Send it back" on the Delivery card.`,
      },
    });
  } else if (
    clearsFailedDelivery(mapIthinkStatus(latest.statusText, latest.statusCode))
  ) {
    await prisma.order.updateMany({
      where: {
        id: orderId,
        needsAttention: { startsWith: FAILED_DELIVERY_NOTE },
      },
      data: { needsAttention: null },
    });
  }
}

export type RefreshOrdersResult =
  | { ok: false; reason: "NOT_SET_UP" }
  | {
      ok: true;
      checked: number;
      changed: number;
      remaining: number;
      /** Orders that just shipped or were delivered: email the customer. */
      events: OrderEvent[];
    };

function refreshWhere(
  startedAt: Date,
  orderId?: string,
): Prisma.ShipmentWhereInput {
  return {
    kind: "ORDER",
    isCurrent: true,
    ...(orderId ? { orderId } : {}),
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
 * Asks iThink about orders on their way: one order (`orderId`) or one round
 * of "Update all" (up to `max` not yet checked since `startedAt`).
 */
export async function refreshOrderShipments(
  input: { startedAt: Date; max?: number; orderId?: string },
  deps: IthinkDeps = {},
): Promise<RefreshOrdersResult> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ok: false, reason: "NOT_SET_UP" };
  const max = Math.max(1, Math.min(input.max ?? 50, 100));
  const where = refreshWhere(input.startedAt, input.orderId);
  const rows = await prisma.shipment.findMany({
    where,
    take: max,
    orderBy: [
      { lastCheckedAt: { sort: "asc", nulls: "first" } },
      { id: "asc" },
    ],
  });
  const open = rows.filter((r) => r.status !== "SENDING" && r.awb);
  const sending = rows.filter((r) => r.status === "SENDING").slice(0, 5);
  let changed = 0;
  const events: OrderEvent[] = [];

  for (const row of sending) {
    const found = await findIthinkParcel(
      config,
      row.reference,
      row.createdAt,
      fetchImpl,
    );
    if (
      found &&
      (await markShipmentBooked(row.id, found.awb, found.courier, now))
    ) {
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
    if (!latest || !row.orderId) continue;
    const orderId = row.orderId;
    const moved = await applyCourierUpdate(
      row,
      latest,
      now,
      async (tx, move) => {
        events.push(
          ...(await moveOrderWithCourier(tx, orderId, move, {
            awb: row.awb,
            courier: latest.courier ?? row.courier,
            courierStatus: latest.statusText || null,
          })),
        );
      },
    );
    if (moved) changed += 1;
    await noteFailedDelivery(orderId, latest, row.ndrActionAt);
  }

  const checkedIds = [...open, ...sending].map((r) => r.id);
  if (checkedIds.length > 0) {
    await prisma.shipment.updateMany({
      where: { id: { in: checkedIds } },
      data: { lastCheckedAt: now },
    });
  }
  const remaining = input.orderId ? 0 : await prisma.shipment.count({ where });
  return { ok: true, checked: checkedIds.length, changed, remaining, events };
}

// ---------------------------------------------------------------------------
// Cancel, view
// ---------------------------------------------------------------------------

export type FailedDeliveryResult =
  { ok: true } | { ok: false; message: string };

/**
 * Staff decide about a failed delivery: the courier tries again (on a day,
 * with an optional new phone or address) or sends the parcel back to us.
 * Clears the order's "couldn't deliver" flag; history and audit rows record
 * what was asked.
 */
export async function actOnFailedDelivery(
  orderId: string,
  action: FailedDeliveryAction,
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<FailedDeliveryResult> {
  const current = await prisma.shipment.findFirst({
    where: { orderId, isCurrent: true, kind: "ORDER" },
  });
  if (
    !current?.awb ||
    !["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(current.status)
  ) {
    return {
      ok: false,
      message:
        "This order isn't with the courier right now, so there's nothing to ask iThink.",
    };
  }
  if (action.kind === "REATTEMPT") {
    const today = new Date(new Date().toDateString());
    if (action.date < today) {
      return { ok: false, message: "Pick today or a later day." };
    }
  } else if (!action.remark.trim()) {
    return { ok: false, message: "Say why it's coming back, for the courier." };
  }
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) {
    return {
      ok: false,
      message: "iThink isn't connected. Do this in the iThink portal instead.",
    };
  }
  const result = await ndrIthinkAction(config, current.awb, action, fetchImpl);
  if (!result.ok) return { ok: false, message: result.reason };

  const day = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  const note =
    action.kind === "REATTEMPT"
      ? `Asked the courier to try again on ${day.format(action.date)}${action.phone || action.address ? " with new contact details" : ""}.`
      : `Asked the courier to send it back to us: ${action.remark.trim()}`;
  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: current.id },
      data: { ndrActionAt: now },
    });
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        note,
        changedBy: actor.staffUserId,
      },
    });
    await tx.order.updateMany({
      where: {
        id: orderId,
        needsAttention: { startsWith: FAILED_DELIVERY_NOTE },
      },
      data: { needsAttention: null },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action:
          action.kind === "REATTEMPT"
            ? "order.shipment.reattempt"
            : "order.shipment.sendBack",
        entityType: "Shipment",
        entityId: current.id,
        beforeState: { failedReason: current.failedReason },
        // Contact details are personal data: record that they changed, not what.
        afterState:
          action.kind === "REATTEMPT"
            ? {
                date: action.date.toISOString(),
                newPhone: Boolean(action.phone),
                newAddress: Boolean(action.address),
              }
            : { remark: action.remark.trim() },
      },
      tx,
    );
  });
  return { ok: true };
}

export type CancelOrderShipmentResult =
  { ok: true; cancelled: boolean } | { ok: false; message: string };

/**
 * Cancels the order's courier booking before the order is cancelled. Fine
 * when there's nothing booked; refuses when the courier may have it.
 */
export async function cancelOrderShipment(
  orderId: string,
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<CancelOrderShipmentResult> {
  const current = await prisma.shipment.findFirst({
    where: { orderId, isCurrent: true },
  });
  if (!current || RESENDABLE.includes(current.status)) {
    return { ok: true, cancelled: false };
  }
  if (current.status === "SENDING") {
    return {
      ok: false,
      message:
        'This order was sent to iThink but we never heard back. Press "Check again" under Delivery first, then cancel.',
    };
  }
  if (current.status !== "BOOKED" || !current.awb) {
    return {
      ok: false,
      message:
        "The courier already has this parcel, so it can't be cancelled here. Ask iThink to return it.",
    };
  }
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) {
    return {
      ok: false,
      message:
        "iThink isn't connected, so the courier booking can't be cancelled from here. Cancel it in the iThink portal first.",
    };
  }
  const result = await cancelIthinkParcel(config, current.awb, fetchImpl);
  if (!result.ok) {
    return {
      ok: false,
      message: `iThink didn't cancel the courier booking, so the order wasn't cancelled. ${result.reason} Press "Get latest update" to check whether it was picked up.`,
    };
  }
  await prisma.$transaction(async (tx) => {
    await tx.shipment.updateMany({
      where: { id: current.id, status: "BOOKED" },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "order.shipment.cancel",
        entityType: "Shipment",
        entityId: current.id,
        beforeState: { status: current.status, awb: current.awb },
        afterState: { status: "CANCELLED" },
      },
      tx,
    );
  });
  return { ok: true, cancelled: true };
}

export interface OrderShipmentView {
  reference: string;
  status: ShipmentStatus;
  awb: string | null;
  courier: string | null;
  courierStatus: string | null;
  trackingUrl: string | null;
  error: string | null;
  bookedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  lastCheckedAt: Date | null;
  /** Sent, but no reply saved for 5 minutes. */
  unsure: boolean;
  /** iThink has it but we have no tracking number: add it, don't resend. */
  needsTrackingNumber: boolean;
  attempts: number;
  /** The courier couldn't deliver and staff haven't chosen what to do yet. */
  failedDelivery: { at: Date; reason: string | null } | null;
}

export async function getOrderShipment(
  orderId: string,
  now = new Date(),
): Promise<OrderShipmentView | null> {
  const [current, attempts] = await Promise.all([
    prisma.shipment.findFirst({ where: { orderId, isCurrent: true } }),
    prisma.shipment.count({ where: { orderId } }),
  ]);
  if (!current) return null;
  return {
    reference: current.reference,
    status: current.status,
    awb: current.awb,
    courier: current.courier,
    courierStatus: current.courierStatus,
    trackingUrl: current.awb ? ithinkTrackingUrl(current.awb) : null,
    error: current.error,
    bookedAt: current.bookedAt,
    pickedUpAt: current.pickedUpAt,
    deliveredAt: current.deliveredAt,
    lastCheckedAt: current.lastCheckedAt,
    unsure:
      current.status === "SENDING" &&
      current.updatedAt.getTime() < now.getTime() - 5 * 60_000 &&
      !needsTrackingNumber(current),
    needsTrackingNumber: needsTrackingNumber(current),
    attempts,
    failedDelivery:
      current.failedAttemptAt &&
      ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(current.status) &&
      (!current.ndrActionAt || current.ndrActionAt < current.failedAttemptAt)
        ? { at: current.failedAttemptAt, reason: current.failedReason }
        : null,
  };
}

/** Open order shipments still worth an "Update all". */
export async function countOpenOrderShipments(): Promise<number> {
  return prisma.shipment.count({
    where: {
      kind: "ORDER",
      isCurrent: true,
      OR: [
        { status: { in: [...OPEN_SHIPMENT_STATUSES] } },
        { status: "SENDING" },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// PIN check
// ---------------------------------------------------------------------------

const PIN_CACHE_MS = 6 * 60 * 60_000;
const pinCache = new Map<
  string,
  { value: PincodeService; expiresAt: number }
>();

/**
 * Whether iThink delivers to a PIN, and takes cash on delivery there.
 * Null when we can't tell (not connected, iThink down): checkout carries on.
 */
export async function checkDeliveryPincode(
  pin: string,
  deps: IthinkDeps = {},
): Promise<PincodeService | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  const hit = pinCache.get(pin);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const { config, fetchImpl } = depsOf(deps);
  if (!config) return null;
  const value = await checkIthinkPincode(config, pin, fetchImpl);
  if (value) {
    if (pinCache.size > 5000) pinCache.clear();
    pinCache.set(pin, { value, expiresAt: Date.now() + PIN_CACHE_MS });
  }
  return value;
}

/** Tests only. */
export function clearPincodeCache(): void {
  pinCache.clear();
}

const pinLimiter = createLazyLimiter({
  limit: 30,
  window: "10 m",
  prefix: "pincode-check",
});

/** PIN checks at checkout are limited per IP (each one may call iThink). */
export async function checkPincodeRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await pinLimiter.check(identifier) };
}
