import { prisma, type Prisma } from "@onwei/database";
import { randomInt } from "node:crypto";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import { refundPayment, releaseHold } from "../commerce/orders";
import { getStoreSettings } from "../commerce/storeSettings";
import { creditLeftOn } from "../commerce/couponEligibility";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  type RazorpayConfig,
} from "../payments/razorpay";
import { getPreorderCampaign, type PreorderCampaignView } from "./campaign";
import { customerCanCancel } from "./rules";

/**
 * After the reserve (docs/COMMERCE_BUILD_PLAN.md section 14a). Stock is
 * already held from the moment the reserve was paid. A week before the
 * window closes the balance nudge goes out (or earlier, when staff send it),
 * which also ends the customer's right to cancel. The balance is due a week
 * after the window closes; unpaid reservations are cancelled and their
 * reserve turns into a personal credit valid for a year.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const CREDIT_VALID_DAYS = 365;
/** The last-call reminder goes out this many days before the balance is due. */
export const LAST_CALL_DAYS = 2;

export interface NudgeResult {
  /** Orders that were nudged now (send them the balance message). */
  nudged: { orderId: string; orderNumber: string }[];
  /** Already nudged, paid or no longer reserved. */
  skipped: number;
}

/**
 * Sends the balance nudge: records the time (which locks cancel) on each
 * reserved, unpaid, not yet nudged order. `orderIds` limits it to those
 * orders; without it every open reservation of the campaign is nudged.
 * Sending the messages is the caller's job (`notifyPreorder`).
 */
export async function nudgePreorderBalance(input: {
  orderIds?: string[];
  campaignId?: string;
  /** Staff sending it; null for the daily job. */
  actor: AuditActor | null;
  now?: Date;
}): Promise<NudgeResult> {
  const now = input.now ?? new Date();
  const where: Prisma.OrderWhereInput = {
    kind: "PREORDER",
    status: "RESERVED",
    balanceNudgedAt: null,
    balancePaidAt: null,
    deletedAt: null,
    ...(input.orderIds ? { id: { in: input.orderIds } } : {}),
    ...(input.campaignId ? { preorderCampaignId: input.campaignId } : {}),
  };
  const orders = await prisma.order.findMany({
    where,
    select: { id: true, orderNumber: true },
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
    take: 1000,
  });
  const result: NudgeResult = {
    nudged: [],
    skipped: input.orderIds ? input.orderIds.length - orders.length : 0,
  };
  for (const order of orders) {
    const done = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: "RESERVED", balanceNudgedAt: null },
          data: { balanceNudgedAt: now, balanceRequestedAt: now },
        });
        if (claimed.count === 0) return false;
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "RESERVED",
            note: "Balance nudge sent. Cancelling is closed",
            changedBy: input.actor?.staffUserId ?? "system",
          },
        });
        if (input.actor)
          await writeAuditLog(
            {
              staffUserId: input.actor.staffUserId,
              action: "preorder.balance.nudge",
              entityType: "Order",
              entityId: order.id,
              beforeState: { balanceNudgedAt: null },
              afterState: { balanceNudgedAt: now.toISOString() },
            },
            tx,
          );
        return true;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
    if (done)
      result.nudged.push({ orderId: order.id, orderNumber: order.orderNumber });
    else result.skipped++;
  }
  return result;
}

/**
 * The Razorpay order a customer pays the balance with. Made again if it's
 * missing (for example if starting it failed when staff asked).
 */
export async function getBalancePayment(
  customerId: string,
  orderNumber: string,
  razorpay: RazorpayConfig | null,
): Promise<{
  keyId: string;
  orderId: string;
  amount: number;
  orderNumber: string;
} | null> {
  if (!razorpay) return null;
  const order = await prisma.order.findFirst({
    where: {
      customerId,
      orderNumber,
      kind: "PREORDER",
      status: "RESERVED",
      balancePaidAt: null,
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      balanceDue: true,
      balanceRazorpayOrderId: true,
    },
  });
  if (!order) return null;
  const amount = toMinorUnits(order.balanceDue ?? 0);
  let rzpId = order.balanceRazorpayOrderId;
  if (!rzpId) {
    const rzp = await createRazorpayOrder(razorpay, {
      amountPaise: amount,
      receipt: `${order.orderNumber}-B`,
      notes: { orderId: order.id, stage: "balance" },
    });
    rzpId = rzp.id;
    await prisma.order.update({
      where: { id: order.id },
      data: { balanceRazorpayOrderId: rzpId, needsAttention: null },
    });
  }
  return {
    keyId: razorpay.keyId,
    orderId: rzpId,
    amount,
    orderNumber: order.orderNumber,
  };
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function creditCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "CR-";
  for (let i = 0; i < 6; i++) out += letters[randomInt(letters.length)];
  return out;
}

export type CancelPreorderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      mode: "CREDIT" | "REFUND";
      /** Paise. */
      amount: number;
      creditCode?: string;
      creditEndsAt?: Date;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "NOT_CANCELLABLE" | "REFUND_FAILED";
      message?: string;
    };

/**
 * Cancels a reserved pre-order (balance not paid). The reserve becomes a
 * personal credit for a year (default), or, staff only, is refunded in cash
 * (`refundAmount`, which may leave out the payment gateway fee). Held stock
 * and coupon uses go back. A customer can cancel only until the window
 * closes and before the balance nudge (`customerCanCancel`).
 */
export async function cancelPreorder(input: {
  orderId: string;
  mode: "CREDIT" | "REFUND";
  reason: string;
  /** Customer cancelling their own order. */
  customerId?: string;
  /** Staff cancelling. */
  actor?: AuditActor;
  /** Paise, REFUND only. Defaults to the whole reserve. */
  refundAmount?: number;
  razorpay?: RazorpayConfig | null;
  now?: Date;
}): Promise<CancelPreorderResult> {
  const now = input.now ?? new Date();
  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      kind: "PREORDER",
      deletedAt: null,
      ...(input.customerId ? { customerId: input.customerId } : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      reserveTotal: true,
      contactEmail: true,
      contactPhone: true,
      balanceNudgedAt: true,
      balancePaidAt: true,
      preorderCampaignId: true,
    },
  });
  if (!order) return { ok: false, reason: "NOT_FOUND" };
  if (order.status !== "RESERVED")
    return { ok: false, reason: "NOT_CANCELLABLE" };
  if (input.mode === "REFUND" && !input.actor)
    return { ok: false, reason: "NOT_CANCELLABLE" };
  if (input.customerId && !input.actor) {
    const campaign = order.preorderCampaignId
      ? await getPreorderCampaign(order.preorderCampaignId)
      : null;
    if (!customerCanCancel(order, campaign?.deadlines.closesAt ?? null, now))
      return { ok: false, reason: "NOT_CANCELLABLE" };
  }
  const reserve = toMinorUnits(order.reserveTotal ?? 0);
  const amount =
    input.mode === "REFUND" && input.refundAmount !== undefined
      ? input.refundAmount
      : reserve;
  if (amount < 0 || amount > reserve)
    return { ok: false, reason: "NOT_CANCELLABLE" };
  const changedBy =
    input.actor?.staffUserId ?? (input.customerId ? "customer" : "system");

  const done = await prisma.$transaction(
    async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "RESERVED",
          balancePaidAt: null,
          // A customer can't cancel once the nudge has gone out, even if it
          // went out a moment ago.
          ...(input.customerId && !input.actor
            ? { balanceNudgedAt: null }
            : {}),
        },
        data: { status: "CANCELLED", cancelReason: input.reason },
      });
      if (claimed.count === 0) return null;
      await releaseHold(tx, order.id);
      // The coupons used on the reserve go back to the customer too.
      await tx.couponRedemption.updateMany({
        where: { orderId: order.id, status: "CONFIRMED" },
        data: { status: "RELEASED" },
      });
      let credit: { id: string; code: string; endsAt: Date } | null = null;
      if (input.mode === "CREDIT" && amount > 0) {
        const contacts = [order.contactEmail, order.contactPhone].filter(
          (c): c is string => Boolean(c),
        );
        const endsAt = new Date(now.getTime() + CREDIT_VALID_DAYS * DAY_MS);
        let created: { id: string; code: string } | null = null;
        for (let attempt = 0; attempt < 5 && !created; attempt++) {
          const code = creditCode();
          const taken = await tx.coupon.findFirst({
            where: { code: { equals: code, mode: "insensitive" } },
            select: { id: true },
          });
          if (taken) continue;
          created = await tx.coupon.create({
            data: {
              code,
              kind: "CREDIT",
              description: `Credit from pre-order ${order.orderNumber}`,
              isActive: true,
              endsAt,
              scope: "CART",
              audience: "SPECIFIC",
              allowedContacts: contacts,
              appliesTo: "BOTH",
              combinableWithCoupons: true,
              rules: {
                create: {
                  type: "FLAT",
                  config: { amount: amount / 100 },
                  stackable: true,
                },
              },
            },
            select: { id: true, code: true },
          });
        }
        if (!created) throw new Error("Could not make a credit code");
        credit = { ...created, endsAt };
        await tx.order.update({
          where: { id: order.id },
          data: { creditCouponId: created.id },
        });
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note:
            input.mode === "CREDIT"
              ? `${input.reason}. Reserve kept as credit ${credit?.code ?? ""}`.trim()
              : amount < reserve
                ? `${input.reason}. ${rupees(amount)} of the ${rupees(reserve)} reserve refunded (payment fee kept)`
                : `${input.reason}. Reserve refunded`,
          changedBy,
        },
      });
      if (input.actor) {
        await writeAuditLog(
          {
            staffUserId: input.actor.staffUserId,
            action: "preorder.cancel",
            entityType: "Order",
            entityId: order.id,
            beforeState: { status: "RESERVED" },
            afterState: {
              status: "CANCELLED",
              mode: input.mode,
              amount: amount / 100,
              reserve: reserve / 100,
              creditCode: credit?.code ?? null,
            },
          },
          tx,
        );
      }
      return { credit };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
  if (!done) return { ok: false, reason: "NOT_CANCELLABLE" };

  if (input.mode === "REFUND" && amount > 0) {
    const refund = await refundPayment({
      orderId: order.id,
      amountPaise: amount,
      note: "Pre-order cancelled, reserve refunded",
      razorpay: input.razorpay ?? null,
      staffUserId: input.actor?.staffUserId ?? null,
    });
    if (!refund.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          needsAttention:
            "Pre-order cancelled but the refund didn't go through. Refund it in Razorpay.",
        },
      });
      return { ok: false, reason: "REFUND_FAILED", message: refund.message };
    }
  }
  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    mode: input.mode,
    amount,
    creditCode: done.credit?.code,
    creditEndsAt: done.credit?.endsAt,
  };
}

export interface PreorderReminderRun {
  /**
   * Send the balance message to these orders: reminder 0 is the nudge,
   * 1 is the last call before the deadline.
   */
  remind: { orderId: string; orderNumber: string; reminder: number }[];
  /** These were cancelled and turned into credit. */
  creditMade: Extract<CancelPreorderResult, { ok: true }>[];
}

/**
 * The daily job, per open reservation, by its campaign's dates:
 * - from the nudge date (window close minus N days): the balance nudge,
 *   unless staff already sent it;
 * - LAST_CALL_DAYS before the balance is due: one last call;
 * - after the balance due date: cancelled, the reserve becomes credit for a
 *   year, nothing ships and the offer ends.
 * Sending the messages is the caller's job.
 */
export async function runPreorderReminders(
  now: Date = new Date(),
  /** Only this campaign's orders (tests). */
  campaignId?: string,
): Promise<PreorderReminderRun> {
  const run: PreorderReminderRun = { remind: [], creditMade: [] };
  const open = await prisma.order.findMany({
    where: {
      kind: "PREORDER",
      status: "RESERVED",
      balancePaidAt: null,
      deletedAt: null,
      preorderCampaignId: campaignId ?? { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      preorderCampaignId: true,
      balanceNudgedAt: true,
      balanceReminderCount: true,
    },
    orderBy: { paidAt: "asc" },
    take: 1000,
  });
  const campaigns = new Map<string, PreorderCampaignView | null>();
  const toNudge: string[] = [];
  for (const order of open) {
    const id = order.preorderCampaignId!;
    if (!campaigns.has(id)) campaigns.set(id, await getPreorderCampaign(id));
    const campaign = campaigns.get(id);
    if (!campaign) continue;
    const { nudgeAt, balanceDueAt } = campaign.deadlines;
    if (now >= balanceDueAt) {
      const cancelled = await cancelPreorder({
        orderId: order.id,
        mode: "CREDIT",
        reason: "Balance not paid by the due date",
        now,
      });
      if (cancelled.ok) run.creditMade.push(cancelled);
      continue;
    }
    if (!order.balanceNudgedAt) {
      if (now >= nudgeAt) toNudge.push(order.id);
      continue;
    }
    const lastCallAt = new Date(
      balanceDueAt.getTime() - LAST_CALL_DAYS * DAY_MS,
    );
    if (order.balanceReminderCount === 0 && now >= lastCallAt) {
      const claimed = await prisma.order.updateMany({
        where: { id: order.id, balanceReminderCount: 0 },
        data: { balanceReminderCount: 1, balanceRemindedAt: now },
      });
      if (claimed.count === 1)
        run.remind.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          reminder: 1,
        });
    }
  }
  if (toNudge.length) {
    const nudged = await nudgePreorderBalance({
      orderIds: toNudge,
      actor: null,
      now,
    });
    for (const order of nudged.nudged)
      run.remind.push({ ...order, reminder: 0 });
  }
  return run;
}

export interface RefundSuggestion {
  /** Paise. */
  reserve: number;
  /** Paise Razorpay kept on the reserve payment, or null if unknown. */
  gatewayFee: number | null;
  /** Paise to fill in the refund box. */
  suggested: number;
  /** The shop setting: cash refunds keep the gateway fee. */
  keepsFee: boolean;
}

/**
 * What staff are offered when refunding a cancelled pre-order in cash: the
 * reserve minus what Razorpay kept on that payment (when the shop setting
 * says so). Staff can change the amount, e.g. to refund in full.
 */
export async function suggestPreorderRefund(
  orderId: string,
  razorpay: RazorpayConfig | null,
): Promise<RefundSuggestion | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, kind: "PREORDER", deletedAt: null },
    select: {
      reserveTotal: true,
      razorpayOrderId: true,
      payments: {
        where: {
          provider: "razorpay",
          status: { in: ["SUCCESS", "REFUNDED"] },
        },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { providerPaymentId: true },
      },
    },
  });
  if (!order) return null;
  const reserve = toMinorUnits(order.reserveTotal ?? 0);
  const { refundKeepsGatewayFee: keepsFee } = await getStoreSettings();
  let gatewayFee: number | null = null;
  const paymentId = order.payments[0]?.providerPaymentId;
  if (razorpay && paymentId) {
    try {
      const payment = await fetchRazorpayPayment(razorpay, paymentId);
      gatewayFee = typeof payment.fee === "number" ? payment.fee : null;
    } catch (error) {
      console.error("[preorders] could not read the payment fee", error);
    }
  }
  const suggested =
    keepsFee && gatewayFee !== null
      ? Math.max(0, reserve - gatewayFee)
      : reserve;
  return { reserve, gatewayFee, suggested, keepsFee };
}

/** Paise left on each of a customer's personal credits, for their account. */
export async function listCustomerCredits(identity: {
  email: string | null;
  phone: string | null;
}): Promise<
  {
    code: string;
    left: number;
    endsAt: Date | null;
    description: string | null;
  }[]
> {
  const contacts = [identity.email, identity.phone].filter((c): c is string =>
    Boolean(c),
  );
  if (contacts.length === 0) return [];
  const coupons = await prisma.coupon.findMany({
    where: {
      kind: "CREDIT",
      isActive: true,
      allowedContacts: { hasSome: contacts },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    include: { rules: { take: 1 } },
    orderBy: { createdAt: "asc" },
  });
  const out = [];
  for (const coupon of coupons) {
    const left = await creditLeftOn(coupon);
    if (left > 0)
      out.push({
        code: coupon.code.toUpperCase(),
        left,
        endsAt: coupon.endsAt,
        description: coupon.description,
      });
  }
  return out;
}
