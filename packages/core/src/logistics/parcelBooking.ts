import { Prisma, prisma, type ShipmentStatus } from "@onwei/database";
import {
  addIthinkParcels,
  findIthinkParcel,
  type IthinkConfig,
  type IthinkOrderInfo,
  type IthinkParcel,
} from "./ithinkClient";
import { canMoveShipment, isPickedUp, mapIthinkStatus } from "./shipmentStatus";

/**
 * Books claimed parcels on iThink (one Add Order call, up to 10) and saves
 * each answer on its Shipment row. Shared by Insider cards and orders.
 */

export interface ClaimedParcel {
  shipmentId: string;
  reference: string;
  createdAt: Date;
  /** Who or what it is, for the summary ("Asha", "ONW1001"). */
  label: string;
  parcel: IthinkParcel;
}

export interface BookingOutcome {
  booked: number;
  failed: number;
  unsure: number;
  problems: { name: string; reason: string }[];
  /** Shipments booked in this call, with their tracking numbers. */
  bookedShipments: {
    shipmentId: string;
    awb: string;
    courier: string | null;
  }[];
}

export async function markShipmentBooked(
  shipmentId: string,
  awb: string,
  courier: string | null,
  now: Date,
): Promise<boolean> {
  const done = await prisma.shipment.updateMany({
    where: { id: shipmentId, status: "SENDING" },
    data: { status: "BOOKED", awb, courier, bookedAt: now, error: null },
  });
  return done.count > 0;
}

async function markFailed(shipmentId: string, reason: string): Promise<void> {
  await prisma.shipment.updateMany({
    where: { id: shipmentId, status: "SENDING" },
    data: { status: "FAILED", error: reason },
  });
}

export async function bookClaimedParcels(
  config: IthinkConfig,
  claimed: ClaimedParcel[],
  fetchImpl: typeof fetch,
  now: Date,
): Promise<BookingOutcome> {
  const out: BookingOutcome = {
    booked: 0,
    failed: 0,
    unsure: 0,
    problems: [],
    bookedShipments: [],
  };
  if (claimed.length === 0) return out;
  const results = await addIthinkParcels(
    config,
    claimed.map((c) => c.parcel),
    fetchImpl,
  );
  for (const [index, result] of results.entries()) {
    const item = claimed[index];
    if (!item) continue;
    const booked = async (awb: string, courier: string | null) => {
      if (await markShipmentBooked(item.shipmentId, awb, courier, now)) {
        out.bookedShipments.push({ shipmentId: item.shipmentId, awb, courier });
      }
      out.booked += 1;
    };
    if (result.outcome === "BOOKED") {
      await booked(result.awb, result.courier);
    } else if (result.outcome === "DUPLICATE") {
      const found = await findIthinkParcel(
        config,
        item.reference,
        item.createdAt,
        fetchImpl,
      );
      if (found) {
        await booked(found.awb, found.courier);
      } else {
        const reason = `iThink already has ${item.reference} but we couldn't read its tracking number. Find it in the iThink portal before sending again.`;
        await markFailed(item.shipmentId, reason);
        out.failed += 1;
        out.problems.push({ name: item.label, reason });
      }
    } else if (result.outcome === "REFUSED") {
      await markFailed(item.shipmentId, result.reason);
      out.failed += 1;
      out.problems.push({ name: item.label, reason: result.reason });
    } else {
      const reason = `${result.reason} Press "Check again" later, it won't be booked twice.`;
      await prisma.shipment.updateMany({
        where: { id: item.shipmentId, status: "SENDING" },
        data: { error: reason },
      });
      out.unsure += 1;
      out.problems.push({ name: item.label, reason });
    }
  }
  return out;
}

export interface ShipmentMove {
  from: ShipmentStatus;
  to: ShipmentStatus;
  /** When iThink saw it (last scan), or now. */
  at: Date;
  /** Set the first time the courier has it. */
  pickedUpAt?: Date;
  deliveredAt?: Date;
}

/**
 * Saves iThink's latest words on a shipment and moves its status on when
 * allowed (forward only). `onMove` runs in the same transaction, for what
 * the parcel belongs to (a card's posted date, an order's status).
 */
export async function applyCourierUpdate(
  row: { id: string; status: ShipmentStatus; pickedUpAt: Date | null },
  latest: Pick<
    IthinkOrderInfo,
    "statusText" | "statusCode" | "courier" | "lastScanAt" | "deliveredAt"
  >,
  now: Date,
  onMove: (tx: Prisma.TransactionClient, move: ShipmentMove) => Promise<void>,
): Promise<ShipmentMove | null> {
  const next = mapIthinkStatus(latest.statusText, latest.statusCode);
  const words = {
    courierStatus: latest.statusText || null,
    ...(latest.courier ? { courier: latest.courier } : {}),
    ...(latest.lastScanAt ? { lastScanAt: latest.lastScanAt } : {}),
  };
  if (!next || !canMoveShipment(row.status, next)) {
    await prisma.shipment.update({ where: { id: row.id }, data: words });
    return null;
  }
  const at = latest.lastScanAt ?? now;
  const move: ShipmentMove = {
    from: row.status,
    to: next,
    at,
    ...(isPickedUp(next) && !row.pickedUpAt ? { pickedUpAt: at } : {}),
    ...(next === "DELIVERED" ? { deliveredAt: latest.deliveredAt ?? at } : {}),
  };
  return prisma.$transaction(async (tx) => {
    const moved = await tx.shipment.updateMany({
      where: { id: row.id, status: row.status },
      data: {
        ...words,
        status: next,
        ...(move.pickedUpAt ? { pickedUpAt: move.pickedUpAt } : {}),
        ...(move.deliveredAt ? { deliveredAt: move.deliveredAt } : {}),
        ...(next === "CANCELLED" ? { cancelledAt: at } : {}),
      },
    });
    if (moved.count === 0) return null;
    await onMove(tx, move);
    return move;
  });
}
