import type { ShipmentStatus } from "@onwei/database";

/**
 * iThink's courier status (Track Order `current_status`, or Order Details
 * `latest_courier_status` in lowercase) in our own words. Unknown text
 * returns null: the parcel keeps its status and staff still see iThink's
 * words. Status list: https://docs.ithinklogistics.com/doc-track-order/3
 */
export function mapIthinkStatus(
  text: string,
  code = "",
): ShipmentStatus | null {
  const status = text.trim().toLowerCase().replace(/\s+/g, " ");
  const statusCode = code.trim().toUpperCase();
  // Return pickups (iThink "REV ..."): collected from the customer and
  // brought back to us.
  if (status.startsWith("rev ")) {
    if (status === "rev manifest" || status === "rev out for pick up") {
      return "BOOKED";
    }
    if (
      status === "rev picked up" ||
      status === "rev in transit" ||
      status === "rev out for delivery"
    ) {
      return "IN_TRANSIT";
    }
    if (status === "rev delivered") return "DELIVERED";
    if (status === "rev cancelled" || status === "rev closed") {
      return "CANCELLED";
    }
    return null;
  }
  if (status === "lost" || status.endsWith("shortage")) return "LOST";
  if (status.startsWith("rto")) {
    return status === "rto delivered" ? "RETURNED" : "RETURNING";
  }
  switch (status) {
    case "manifested":
    case "not picked":
    case "pickup scheduled":
    case "pending":
      return "BOOKED";
    case "picked up":
    case "in transit":
    case "reached at destination":
    case "undelivered":
    case "out of delivery area":
    case "delayed":
    case "damaged":
    case "misrouted":
      return "IN_TRANSIT";
    case "out for delivery":
      return "OUT_FOR_DELIVERY";
    case "delivered":
      return "DELIVERED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
  }
  if (statusCode === "DL") return "DELIVERED";
  if (statusCode === "CN") return "CANCELLED";
  if (statusCode === "RT") return "RETURNING";
  return null;
}

/**
 * The courier tried and couldn't deliver (iThink's "Undelivered" or "Out of
 * Delivery Area"). The parcel stays on its way; staff choose try again or
 * send it back.
 */
export function isFailedDelivery(text: string): boolean {
  const status = text.trim().toLowerCase().replace(/\s+/g, " ");
  return status === "undelivered" || status === "out of delivery area";
}

/** Statuses after which a failed attempt no longer matters. */
const PAST_FAILURE: readonly ShipmentStatus[] = [
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNING",
  "RETURNED",
  "LOST",
  "CANCELLED",
];

/** A failed attempt is settled once the parcel is out again or done. */
export function clearsFailedDelivery(status: ShipmentStatus | null): boolean {
  return status !== null && PAST_FAILURE.includes(status);
}

const FORWARD_RANK: Partial<Record<ShipmentStatus, number>> = {
  SENDING: 0,
  BOOKED: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

/** Statuses a parcel never leaves on a courier update. */
export const FINAL_SHIPMENT_STATUSES: readonly ShipmentStatus[] = [
  "DELIVERED",
  "RETURNED",
  "LOST",
  "CANCELLED",
  "FAILED",
];

/** Statuses still worth asking iThink about. */
export const OPEN_SHIPMENT_STATUSES: readonly ShipmentStatus[] = [
  "BOOKED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "RETURNING",
];

/**
 * Whether a courier update may move a parcel from `from` to `to`. Forward
 * steps only (an update seen late never moves it back), plus coming back,
 * lost, and cancelled before pickup.
 */
export function canMoveShipment(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  if (from === to) return false;
  if (FINAL_SHIPMENT_STATUSES.includes(from)) return false;
  if (to === "CANCELLED") return from === "SENDING" || from === "BOOKED";
  if (to === "LOST") return true;
  if (to === "RETURNED") return true;
  if (to === "RETURNING") return from !== "SENDING";
  if (from === "RETURNING") return false;
  const a = FORWARD_RANK[from];
  const b = FORWARD_RANK[to];
  return a !== undefined && b !== undefined && b > a;
}

/** Courier has the parcel (picked up or further along). */
export function isPickedUp(status: ShipmentStatus): boolean {
  return (
    status === "IN_TRANSIT" ||
    status === "OUT_FOR_DELIVERY" ||
    status === "DELIVERED" ||
    status === "RETURNING" ||
    status === "RETURNED"
  );
}

/** Plain label for admin. */
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  SENDING: "Sending to iThink",
  BOOKED: "Booked, waiting for pickup",
  IN_TRANSIT: "On the way",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  RETURNING: "Coming back to us",
  RETURNED: "Came back to us",
  LOST: "Lost by the courier",
  CANCELLED: "Cancelled",
  FAILED: "Not sent",
};
