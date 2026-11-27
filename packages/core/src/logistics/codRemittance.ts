import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import { createLazyLimiter } from "../rateLimit/lazyLimiter";
import { depsOf, type IthinkDeps } from "./cardShipments";
import { getIthinkRemittances, type IthinkRemittance } from "./ithinkClient";

/**
 * COD money: iThink collects cash on delivery and pays it into our bank in
 * payouts (remittances). "Update from iThink" in admin reads the payouts for
 * recent days and marks each cash on delivery order as paid out. An amount
 * that differs from what we expected flags the order for staff.
 */

/** Days asked per press (each is two iThink calls). */
export const COD_IMPORT_DAYS = 14;

export const COD_MISMATCH_NOTE = "iThink paid";

export interface CodImportResult {
  ok: boolean;
  payouts: number;
  /** Orders newly marked as paid out. */
  matched: number;
  /** Orders where iThink paid a different amount (flagged). */
  mismatched: number;
  /** Parcels in a payout that aren't one of our orders. */
  unknown: number;
  /** Days iThink didn't answer for. */
  missedDays: number;
}

const DAY_MS = 24 * 60 * 60_000;

/** The payout an order is linked to, when a day has more than one. */
function payoutFor(payouts: IthinkRemittance[]): IthinkRemittance | null {
  return payouts[0] ?? null;
}

export async function importCodRemittances(
  actor: AuditActor,
  input: { days?: number } = {},
  deps: IthinkDeps = {},
): Promise<CodImportResult> {
  const result: CodImportResult = {
    ok: true,
    payouts: 0,
    matched: 0,
    mismatched: 0,
    unknown: 0,
    missedDays: 0,
  };
  const { config, fetchImpl, now } = depsOf(deps);
  if (!config) return { ...result, ok: false };
  const days = Math.max(1, Math.min(input.days ?? COD_IMPORT_DAYS, 31));

  for (let d = 0; d < days; d += 1) {
    const day = new Date(now.getTime() - d * DAY_MS);
    const answer = await getIthinkRemittances(config, day, fetchImpl);
    if (!answer) {
      result.missedDays += 1;
      continue;
    }
    const saved = new Map<string, string>();
    for (const p of answer.payouts) {
      const fields = {
        remittanceDate: p.remittanceDate ?? day,
        codGenerated: p.codGenerated,
        billAdjusted: p.billAdjusted,
        refundAdjusted: p.refundAdjusted,
        transactionCharges: p.transactionCharges,
        gstCharges: p.gstCharges,
        walletAmount: p.walletAmount,
        advanceHold: p.advanceHold,
        codRemitted: p.codRemitted,
      };
      const row = await prisma.codRemittance.upsert({
        where: { remittanceId: p.remittanceId },
        create: { remittanceId: p.remittanceId, ...fields },
        update: fields,
      });
      saved.set(p.remittanceId, row.id);
      result.payouts += 1;
    }
    const payout = payoutFor(answer.payouts);
    const payoutRowId = payout
      ? (saved.get(payout.remittanceId) ?? null)
      : null;
    if (answer.lines.length === 0) continue;

    const shipments = await prisma.shipment.findMany({
      where: { kind: "ORDER", awb: { in: answer.lines.map((l) => l.awb) } },
      select: {
        awb: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            paymentMethod: true,
            total: true,
            codRemittanceId: true,
            needsAttention: true,
          },
        },
      },
    });
    const byAwb = new Map(shipments.map((s) => [s.awb, s.order]));
    for (const line of answer.lines) {
      const order = byAwb.get(line.awb);
      if (!order) {
        result.unknown += 1;
        continue;
      }
      if (order.paymentMethod !== "COD" || order.codRemittanceId) continue;
      const expected = toMinorUnits(order.total);
      const paid = Math.round(line.amount * 100);
      const differs = paid !== expected;
      const done = await prisma.order.updateMany({
        where: { id: order.id, codRemittanceId: null },
        data: {
          codRemittanceId: payoutRowId,
          codRemittedAt: payout?.remittanceDate ?? day,
          ...(differs && !order.needsAttention
            ? {
                needsAttention: `${COD_MISMATCH_NOTE} ₹${(paid / 100).toLocaleString("en-IN")} for this order, we expected ₹${(expected / 100).toLocaleString("en-IN")}. Check the payout in the iThink portal.`,
              }
            : {}),
        },
      });
      if (done.count === 0) continue;
      result.matched += 1;
      if (differs) result.mismatched += 1;
    }
  }

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "cod.remittance.import",
    entityType: "CodRemittance",
    entityId: `${days}d`,
    afterState: { ...result, days },
  });
  return result;
}

const importLimiter = createLazyLimiter({
  limit: 6,
  window: "10 m",
  prefix: "cod-import",
});

/** "Update from iThink" on COD money: 6 presses per 10 minutes per staff member. */
export async function checkCodImportRateLimit(
  staffUserId: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await importLimiter.check(staffUserId) };
}

export interface CodPayoutRow {
  id: string;
  remittanceId: string;
  remittanceDate: Date;
  codGenerated: number;
  deductions: number;
  codRemitted: number;
  orders: number;
}

/** Payouts, newest first (admin COD money > Payouts). */
export async function listCodPayouts(page: {
  skip: number;
  take: number;
}): Promise<CodPayoutRow[]> {
  const rows = await prisma.codRemittance.findMany({
    orderBy: [{ remittanceDate: "desc" }, { id: "asc" }],
    include: { _count: { select: { orders: true } } },
    ...page,
  });
  const rupees = (v: Parameters<typeof toMinorUnits>[0]) => toMinorUnits(v);
  return rows.map((r) => ({
    id: r.id,
    remittanceId: r.remittanceId,
    remittanceDate: r.remittanceDate,
    codGenerated: rupees(r.codGenerated),
    deductions:
      rupees(r.billAdjusted) +
      rupees(r.refundAdjusted) +
      rupees(r.transactionCharges) +
      rupees(r.gstCharges) +
      rupees(r.advanceHold),
    codRemitted: rupees(r.codRemitted),
    orders: r._count.orders,
  }));
}

export interface UnpaidCodRow {
  id: string;
  orderNumber: string;
  total: number;
  deliveredAt: Date | null;
  daysSinceDelivery: number | null;
}

/** Delivered cash on delivery orders iThink hasn't paid out yet, oldest first. */
export async function listUnpaidCodOrders(
  page: { skip: number; take: number },
  now = new Date(),
): Promise<UnpaidCodRow[]> {
  const rows = await prisma.order.findMany({
    where: {
      paymentMethod: "COD",
      status: { in: ["DELIVERED", "RETURN_REQUESTED", "RETURNED"] },
      codRemittanceId: null,
      deletedAt: null,
    },
    orderBy: [{ deliveredAt: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    select: { id: true, orderNumber: true, total: true, deliveredAt: true },
    ...page,
  });
  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    total: toMinorUnits(r.total),
    deliveredAt: r.deliveredAt,
    daysSinceDelivery: r.deliveredAt
      ? Math.floor((now.getTime() - r.deliveredAt.getTime()) / DAY_MS)
      : null,
  }));
}
