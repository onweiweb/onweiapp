import { prisma } from "@onwei/database";
import { refreshCardShipments, type IthinkDeps } from "./cardShipments";
import { refreshOrderShipments, type OrderEvent } from "./orderShipments";
import { OPEN_SHIPMENT_STATUSES } from "./shipmentStatus";

/** Most tracking numbers taken from one webhook call. */
export const ITHINK_WEBHOOK_MAX = 50;

function awbOf(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const value = (item as Record<string, unknown>).awb_number;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const awb = value.trim();
  return awb.length > 0 && awb.length <= 64 ? awb : null;
}

/**
 * Tracking numbers in an iThink status push (one object or a list). The
 * rest of the payload is ignored: each parcel is re-checked with Track Order,
 * so a forged or garbled push can't move anything on its own.
 */
export function parseIthinkWebhook(body: unknown): string[] {
  const items = Array.isArray(body) ? body : [body];
  const awbs = new Set<string>();
  for (const item of items) {
    const awb = awbOf(item);
    if (awb) awbs.add(awb);
    if (awbs.size >= ITHINK_WEBHOOK_MAX) break;
  }
  return [...awbs];
}

export interface IthinkWebhookResult {
  ok: boolean;
  /** Our open parcels with these tracking numbers. */
  matched: number;
  changed: number;
  /** Orders that just shipped or were delivered: email the customer. */
  events: OrderEvent[];
}

/**
 * Asks iThink (Track Order) about our open parcels with these tracking
 * numbers and applies what it says, through the same code as the "Update
 * from iThink" buttons. Unknown tracking numbers are ignored.
 */
export async function handleIthinkWebhook(
  awbs: string[],
  deps: IthinkDeps = {},
): Promise<IthinkWebhookResult> {
  const none: IthinkWebhookResult = {
    ok: true,
    matched: 0,
    changed: 0,
    events: [],
  };
  if (awbs.length === 0) return none;
  const rows = await prisma.shipment.findMany({
    where: {
      awb: { in: awbs },
      isCurrent: true,
      status: { in: [...OPEN_SHIPMENT_STATUSES] },
    },
    select: { id: true, kind: true, orderId: true },
  });
  if (rows.length === 0) return none;

  // Ahead of now, so a parcel checked a moment ago is still asked again.
  const startedAt = new Date((deps.now ?? new Date()).getTime() + 1000);
  let ok = true;
  let changed = 0;
  const events: OrderEvent[] = [];

  const orderIds = [
    ...new Set(
      rows
        .filter((r) => r.kind === "ORDER" && r.orderId)
        .map((r) => r.orderId as string),
    ),
  ];
  for (const orderId of orderIds) {
    const result = await refreshOrderShipments({ orderId, startedAt }, deps);
    if (!result.ok) {
      ok = false;
      break;
    }
    changed += result.changed;
    events.push(...result.events);
  }

  const cardIds = rows
    .filter((r) => r.kind === "INSIDER_CARD")
    .map((r) => r.id);
  if (ok && cardIds.length > 0) {
    const result = await refreshCardShipments(
      { startedAt, shipmentIds: cardIds, max: cardIds.length },
      deps,
    );
    if (result.ok) changed += result.changed;
    else ok = false;
  }

  return { ok, matched: rows.length, changed, events };
}
