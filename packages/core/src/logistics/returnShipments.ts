import { Prisma, prisma, type ShipmentStatus } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import type { AddressSnapshot } from "../commerce/orders";
import { getStoreSettings } from "../commerce/storeSettings";
import { depsOf, type IthinkDeps } from "./cardShipments";
import {
  cancelIthinkParcel,
  findIthinkParcel,
  ithinkTrackingUrl,
  trackIthinkParcels,
  type IthinkConfig,
  type IthinkParcel,
} from "./ithinkClient";
import { parcelSize, shipperBoxOf } from "./orderShipments";
import {
  ALREADY_IN_ITHINK,
  applyCourierUpdate,
  bookClaimedParcels,
  markShipmentBooked,
} from "./parcelBooking";
import { OPEN_SHIPMENT_STATUSES, isPickedUp } from "./shipmentStatus";
import { needsTrackingNumber } from "./trackingMatch";

/**
 * Return pickups through iThink (a "reverse" parcel): the courier collects
 * the returned item from the customer's delivery address and brings it to
 * our warehouse. Staff book it after approving the return. Picked up moves
 * the return to "picked up"; staff still mark it received and refund.
 */

/** Pickup statuses after which a new pickup can be booked. */
const REBOOKABLE: ShipmentStatus[] = ["CANCELLED", "FAILED"];

const rupees = (value: Prisma.Decimal | number) => toMinorUnits(value) / 100;

/** "ONW1001-R1", a second try "ONW1001-R2" (test server adds a random tail). */
export function returnReference(
  orderNumber: string,
  attempt: number,
  mode: IthinkConfig["mode"],
  unique: string,
): string {
  const base = `${orderNumber}-R${attempt}`;
  return mode === "staging"
    ? `${base}-${unique.slice(-6).toUpperCase()}`
    : base;
}

/** The reverse parcel: the returned units, collected from the customer. */
export function buildReturnParcel(
  input: {
    reference: string;
    placedAt: Date;
    address: AddressSnapshot;
    contactPhone: string | null;
    contactEmail: string | null;
    item: {
      productName: string;
      variantLabel: string;
      sku: string;
      unitPrice: Prisma.Decimal | number;
      gstRate: Prisma.Decimal | number | null;
      hsnCode: string | null;
      weightGrams: number | null;
      box: ReturnType<typeof shipperBoxOf>;
    };
    quantity: number;
  },
  fallback: Parameters<typeof parcelSize>[1],
): IthinkParcel {
  const { item, address } = input;
  const price = Math.max(rupees(item.unitPrice), 1);
  const size = parcelSize(
    [
      {
        quantity: input.quantity,
        weightGrams: item.weightGrams,
        box: item.box,
      },
    ],
    fallback,
  );
  return {
    reference: input.reference,
    orderDate: input.placedAt,
    name: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    pin: address.postalCode,
    phone: address.phone || input.contactPhone || "",
    email: input.contactEmail ?? "",
    products: [
      {
        name: item.variantLabel
          ? `${item.productName} (${item.variantLabel})`
          : item.productName,
        sku: item.sku,
        quantity: input.quantity,
        price,
        taxRate: item.gstRate == null ? null : Number(item.gstRate),
        hsn: item.hsnCode,
      },
    ],
    totalAmount: Math.round(price * input.quantity * 100) / 100,
    // Return pickups are always prepaid: nothing is collected.
    paymentMode: "Prepaid",
    codAmount: 0,
    lengthCm: size.lengthCm,
    widthCm: size.widthCm,
    heightCm: size.heightCm,
    weightKg: size.weightKg,
    orderType: "reverse",
  };
}

export type BookReturnPickupResult =
  { ok: true; awb: string } | { ok: false; message: string };

/** Books the courier pickup for an approved return. */
export async function bookReturnPickup(
  returnId: string,
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<BookReturnPickupResult> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) {
    return {
      ok: false,
      message: "iThink isn't connected, so a pickup can't be booked from here.",
    };
  }
  const row = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      order: {
        select: {
          orderNumber: true,
          placedAt: true,
          contactPhone: true,
          contactEmail: true,
          shippingAddressSnapshot: true,
        },
      },
      orderItem: {
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
      shipments: { where: { isCurrent: true }, take: 1 },
    },
  });
  if (!row) return { ok: false, message: "This return no longer exists." };
  if (row.status !== "APPROVED") {
    return {
      ok: false,
      message: "Approve the return first. A pickup can only be booked once.",
    };
  }
  const address = row.order.shippingAddressSnapshot as AddressSnapshot | null;
  if (!address) {
    return {
      ok: false,
      message: "This order has no delivery address saved to collect from.",
    };
  }
  const current = row.shipments[0];
  if (current && needsTrackingNumber(current)) {
    return { ok: false, message: ALREADY_IN_ITHINK };
  }
  if (
    current &&
    current.status !== "SENDING" &&
    !REBOOKABLE.includes(current.status)
  ) {
    return {
      ok: false,
      message: "A pickup is already booked for this return. Refresh the page.",
    };
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
        const attempt =
          (await tx.shipment.count({ where: { returnRequestId: returnId } })) +
          1;
        const ref = returnReference(
          row.order.orderNumber,
          attempt,
          config.mode,
          crypto.randomUUID().replace(/-/g, ""),
        );
        const off = await tx.shipment.updateMany({
          where: {
            returnRequestId: returnId,
            isCurrent: true,
            status: { in: REBOOKABLE },
          },
          data: { isCurrent: false },
        });
        if (current && off.count === 0) return null;
        const created = await tx.shipment.create({
          data: {
            kind: "RETURN",
            returnRequestId: returnId,
            reference: ref,
            status: "SENDING",
            sentByStaffId: actor.staffUserId,
          },
        });
        await writeAuditLog(
          {
            staffUserId: actor.staffUserId,
            action: "return.pickup.book",
            entityType: "Shipment",
            entityId: created.id,
            afterState: { returnId, reference: ref, attempt },
          },
          tx,
        );
        return created;
      });
      if (!made) {
        return { ok: false, message: "Someone else just booked it. Refresh." };
      }
      shipmentId = made.id;
      reference = made.reference;
      createdAt = made.createdAt;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, message: "Someone else just booked it. Refresh." };
      }
      throw error;
    }
  }

  const fallback = await getStoreSettings();
  const parcel = buildReturnParcel(
    {
      reference,
      placedAt: row.order.placedAt,
      address,
      contactPhone: row.order.contactPhone,
      contactEmail: row.order.contactEmail,
      item: {
        ...row.orderItem,
        hsnCode: row.orderItem.productVariant.product.hsnCode,
        weightGrams: row.orderItem.productVariant.weightGrams,
        box: shipperBoxOf(row.orderItem.productVariant.product.category),
      },
      quantity: row.quantity,
    },
    fallback,
  );
  const outcome = await bookClaimedParcels(
    config,
    [
      {
        shipmentId,
        reference,
        createdAt,
        label: row.order.orderNumber,
        parcel,
      },
    ],
    fetchImpl,
    now,
  );
  const booked = outcome.bookedShipments[0];
  if (booked) return { ok: true, awb: booked.awb };
  return {
    ok: false,
    message:
      outcome.problems[0]?.reason ??
      "iThink didn't book the pickup. Try again in a minute.",
  };
}

/** Cancels a pickup the courier hasn't done yet. */
export async function cancelReturnPickup(
  returnId: string,
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = await prisma.shipment.findFirst({
    where: { returnRequestId: returnId, isCurrent: true },
  });
  if (!current || current.status !== "BOOKED" || !current.awb) {
    return {
      ok: false,
      message: "There's no pickup waiting to be cancelled. Refresh the page.",
    };
  }
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) {
    return {
      ok: false,
      message: "iThink isn't connected. Cancel it in the iThink portal.",
    };
  }
  const result = await cancelIthinkParcel(config, current.awb, fetchImpl);
  if (!result.ok) return { ok: false, message: result.reason };
  await prisma.$transaction(async (tx) => {
    await tx.shipment.updateMany({
      where: { id: current.id, status: "BOOKED" },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "return.pickup.cancel",
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

/**
 * Asks iThink about open return pickups (all, or the given ones) and moves
 * the return to "picked up" once the courier has it. A pickup the courier
 * cancels flags the order for staff.
 */
export async function refreshReturnPickups(
  input: { shipmentIds?: string[]; returnId?: string },
  deps: IthinkDeps = {},
): Promise<{ ok: boolean; changed: number }> {
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ok: false, changed: 0 };
  const rows = await prisma.shipment.findMany({
    where: {
      kind: "RETURN",
      isCurrent: true,
      ...(input.shipmentIds ? { id: { in: input.shipmentIds } } : {}),
      ...(input.returnId ? { returnRequestId: input.returnId } : {}),
      OR: [
        { status: { in: [...OPEN_SHIPMENT_STATUSES] }, awb: { not: null } },
        { status: "SENDING" },
      ],
    },
    include: {
      returnRequest: {
        select: {
          id: true,
          orderId: true,
          orderItem: { select: { productName: true } },
        },
      },
    },
    take: 50,
  });
  let changed = 0;
  for (const row of rows.filter((r) => r.status === "SENDING").slice(0, 5)) {
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
  const open = rows.filter((r) => r.status !== "SENDING" && r.awb);
  const info = await trackIthinkParcels(
    config,
    open.map((r) => r.awb as string),
    fetchImpl,
  );
  for (const row of open) {
    const latest = info.get(row.awb as string);
    const ret = row.returnRequest;
    if (!latest || !ret) continue;
    const moved = await applyCourierUpdate(
      row,
      latest,
      now,
      async (tx, move) => {
        if (isPickedUp(move.to)) {
          await tx.returnRequest.updateMany({
            where: { id: ret.id, status: "APPROVED" },
            data: { status: "PICKED_UP" },
          });
        }
        if (move.to === "CANCELLED") {
          await tx.order.updateMany({
            where: { id: ret.orderId, needsAttention: null },
            data: {
              needsAttention: `The courier cancelled the return pickup for ${ret.orderItem.productName}. Book it again or ask the customer to send it.`,
            },
          });
        }
      },
    );
    if (moved) changed += 1;
  }
  if (rows.length > 0) {
    await prisma.shipment.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { lastCheckedAt: now },
    });
  }
  return { ok: true, changed };
}

export interface ReturnPickupView {
  status: ShipmentStatus;
  awb: string | null;
  courier: string | null;
  courierStatus: string | null;
  trackingUrl: string | null;
  error: string | null;
  needsTrackingNumber: boolean;
}

/** The current pickup for each of these returns (admin and the order page). */
export async function getReturnPickups(
  returnIds: string[],
): Promise<Map<string, ReturnPickupView>> {
  const out = new Map<string, ReturnPickupView>();
  if (returnIds.length === 0) return out;
  const rows = await prisma.shipment.findMany({
    where: { returnRequestId: { in: returnIds }, isCurrent: true },
  });
  for (const row of rows) {
    if (!row.returnRequestId) continue;
    out.set(row.returnRequestId, {
      status: row.status,
      awb: row.awb,
      courier: row.courier,
      courierStatus: row.courierStatus,
      trackingUrl: row.awb ? ithinkTrackingUrl(row.awb) : null,
      error: row.error,
      needsTrackingNumber: needsTrackingNumber(row),
    });
  }
  return out;
}
