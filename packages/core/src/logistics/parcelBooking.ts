import { Prisma, prisma, type ShipmentStatus } from "@onwei/database";
import {
  addIthinkParcels,
  findIthinkParcel,
  type AddParcelResult,
  type IthinkConfig,
  type IthinkOrderInfo,
  type IthinkParcel,
} from "./ithinkClient";
import {
  canMoveShipment,
  clearsFailedDelivery,
  isFailedDelivery,
  isPickedUp,
  mapIthinkStatus,
} from "./shipmentStatus";

/**
 * Books claimed parcels on iThink and saves each answer on its Shipment row.
 * Shared by Insider cards and orders. One parcel per Add Order call, a few
 * at a time: a refusal or a slow reply then only touches its own parcel
 * (2026-11-26, a batch of 10 lost its reply and every card was stuck).
 */

/** Add Order calls in flight at once. 10 parcels fit a 60s request. */
const PARALLEL_SENDS = 5;

/**
 * Saved on a parcel iThink already has but whose tracking number we
 * couldn't read. Never "Not sent": sending it again as a new attempt would
 * book a second parcel. Staff paste the tracking number from the portal.
 */
export const ALREADY_IN_ITHINK =
  'iThink already has this booking but didn\'t send its tracking number. Copy the tracking number from the iThink portal and paste it in "Add tracking numbers".';

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
  const results: AddParcelResult[] = [];
  for (let i = 0; i < claimed.length; i += PARALLEL_SENDS) {
    const chunk = claimed.slice(i, i + PARALLEL_SENDS);
    const answers = await Promise.all(
      chunk.map(async (c) => {
        const [answer] = await addIthinkParcels(config, [c.parcel], fetchImpl);
        return answer as AddParcelResult;
      }),
    );
    results.push(...answers);
  }
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
      const found = result.awb
        ? { awb: result.awb, courier: null }
        : await findIthinkParcel(
            config,
            item.reference,
            item.createdAt,
            fetchImpl,
          );
      if (found) {
        await booked(found.awb, found.courier);
      } else {
        // Booked on iThink: stays "sending" (never sent again as a new
        // attempt) until staff add its tracking number.
        await prisma.shipment.updateMany({
          where: { id: item.shipmentId, status: "SENDING" },
          data: { error: ALREADY_IN_ITHINK },
        });
        out.unsure += 1;
        out.problems.push({ name: item.label, reason: ALREADY_IN_ITHINK });
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
  > & { reason?: string | null },
  now: Date,
  onMove: (tx: Prisma.TransactionClient, move: ShipmentMove) => Promise<void>,
): Promise<ShipmentMove | null> {
  const next = mapIthinkStatus(latest.statusText, latest.statusCode);
  const failed = isFailedDelivery(latest.statusText);
  const words = {
    courierStatus: latest.statusText || null,
    ...(latest.courier ? { courier: latest.courier } : {}),
    ...(latest.lastScanAt ? { lastScanAt: latest.lastScanAt } : {}),
    // A failed attempt is kept until the parcel is out again or done.
    ...(failed
      ? {
          failedAttemptAt: latest.lastScanAt ?? now,
          failedReason: latest.reason?.trim() || null,
        }
      : clearsFailedDelivery(next)
        ? { failedAttemptAt: null, failedReason: null }
        : {}),
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
