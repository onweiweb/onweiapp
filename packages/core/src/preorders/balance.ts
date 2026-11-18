import { prisma, type Prisma } from "@onwei/database";
import { randomInt } from "node:crypto";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import {
  convertHoldToSale,
  refundPayment,
  releaseHold,
} from "../commerce/orders";
import { creditLeftOn } from "../commerce/couponEligibility";
import { createRazorpayOrder, type RazorpayConfig } from "../payments/razorpay";

/**
 * After the reserve: staff say "stock is in", the oldest reservations get
 * stock held and a balance link, reminders go out, and a reservation that is
 * cancelled (by the customer, by staff, or because the balance was never
 * paid) turns its reserve into a personal credit valid for a year.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const BALANCE_REMINDER_DAYS = [3, 7] as const;
export const BALANCE_CANCEL_DAYS = 14;
export const CREDIT_VALID_DAYS = 365;

/** Holds stock for one order line from a warehouse with enough. */
async function holdLine(
  tx: Prisma.TransactionClient,
  item: { id: string; productVariantId: string; quantity: number },
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ warehouseId: string }[]>`
    UPDATE "Inventory" SET "quantityReserved" = "quantityReserved" + ${item.quantity}
    WHERE "id" = (
      SELECT "id" FROM "Inventory"
      WHERE "productVariantId" = ${item.productVariantId}
        AND "quantityOnHand" - "quantityReserved" >= ${item.quantity}
      ORDER BY "quantityOnHand" - "quantityReserved" DESC
      LIMIT 1
      FOR UPDATE
    )
    AND "quantityOnHand" - "quantityReserved" >= ${item.quantity}
    RETURNING "warehouseId"`;
  const row = rows[0];
  if (!row) return false;
  await tx.orderItem.update({
    where: { id: item.id },
    data: { warehouseId: row.warehouseId },
  });
  return true;
}

export interface BalanceRequestResult {
  /** Orders that got stock held and a balance link. */
  asked: { orderId: string; orderNumber: string; balanceDue: number }[];
  /** Orders whose balance was 0: confirmed straight away. */
  confirmed: { orderId: string; orderNumber: string }[];
  /** Still waiting because there wasn't enough stock. */
  waiting: number;
  /** Gifts that were out of stock (the order still goes ahead). */
  missingGifts: number;
  /** Razorpay could not start a payment for these. */
  failed: number;
}

/**
 * "Stock is in, ask for balance" for one product: oldest reservations first,
 * as far as stock goes. Each order's own lines are held in one transaction;
 * a gift that has run out doesn't stop the order, it's flagged for staff.
 */
export async function requestPreorderBalance(input: {
  productId: string;
  actor: AuditActor;
  razorpay: RazorpayConfig | null;
  limit?: number;
}): Promise<BalanceRequestResult | { error: "PAYMENT_UNAVAILABLE" }> {
  if (!input.razorpay) return { error: "PAYMENT_UNAVAILABLE" };
  const orders = await prisma.order.findMany({
    where: {
      kind: "PREORDER",
      status: "RESERVED",
      balanceRequestedAt: null,
      deletedAt: null,
      items: {
        some: { isFree: false, productVariant: { productId: input.productId } },
      },
    },
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
    take: input.limit ?? 200,
    include: { items: true },
  });

  const result: BalanceRequestResult = {
    asked: [],
    confirmed: [],
    waiting: 0,
    missingGifts: 0,
    failed: 0,
  };
  let outOfStock = false;

  for (const order of orders) {
    if (outOfStock) {
      result.waiting++;
      continue;
    }
    const held = await prisma
      .$transaction(async (tx) => {
        const paid = order.items.filter((i) => !i.isFree);
        for (const item of paid) {
          if (!(await holdLine(tx, item))) throw new NoStock();
        }
        let missing = 0;
        for (const item of order.items.filter((i) => i.isFree)) {
          if (!(await holdLine(tx, item))) missing++;
        }
        const balance = toMinorUnits(order.balanceDue ?? 0);
        await tx.order.update({
          where: { id: order.id },
          data: {
            balanceRequestedAt: new Date(),
            ...(missing
              ? {
                  needsAttention: `${missing} free item${missing === 1 ? " is" : "s are"} out of stock for this pre-order. Restock or tell the customer.`,
                }
              : {}),
            ...(balance === 0
              ? { status: "CONFIRMED", balancePaidAt: new Date() }
              : {}),
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: balance === 0 ? "CONFIRMED" : "RESERVED",
            note:
              balance === 0
                ? "Stock is in. Nothing left to pay"
                : "Stock is in. Balance requested",
            changedBy: input.actor.staffUserId,
          },
        });
        return { missing, balance };
      })
      .catch((error: unknown) => {
        if (error instanceof NoStock) return null;
        throw error;
      });

    if (!held) {
      outOfStock = true;
      result.waiting++;
      continue;
    }
    result.missingGifts += held.missing;
    if (held.balance === 0) {
      await prisma.$transaction((tx) => convertHoldToSale(tx, order.id));
      result.confirmed.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      continue;
    }
    try {
      const rzp = await createRazorpayOrder(input.razorpay, {
        amountPaise: held.balance,
        receipt: `${order.orderNumber}-B`,
        notes: { orderId: order.id, stage: "balance" },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { balanceRazorpayOrderId: rzp.id },
      });
      result.asked.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        balanceDue: held.balance,
      });
    } catch (error) {
      console.error("[preorders] balance order failed", error);
      result.failed++;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          needsAttention:
            "Couldn't start the balance payment. Try asking for the balance again.",
        },
      });
    }
  }

  await writeAuditLog({
    staffUserId: input.actor.staffUserId,
    action: "preorder.balance.request",
    entityType: "Product",
    entityId: input.productId,
    afterState: {
      asked: result.asked.length,
      confirmed: result.confirmed.length,
      waiting: result.waiting,
      missingGifts: result.missingGifts,
      failed: result.failed,
    },
  });
  return result;
}

class NoStock extends Error {}

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
      balanceRequestedAt: { not: null },
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
 * personal credit for a year (default), or, staff only, is refunded.
 * Held stock and coupon uses go back.
 */
export async function cancelPreorder(input: {
  orderId: string;
  mode: "CREDIT" | "REFUND";
  reason: string;
  /** Customer cancelling their own order. */
  customerId?: string;
  /** Staff cancelling. */
  actor?: AuditActor;
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
    },
  });
  if (!order) return { ok: false, reason: "NOT_FOUND" };
  if (order.status !== "RESERVED")
    return { ok: false, reason: "NOT_CANCELLABLE" };
  if (input.mode === "REFUND" && !input.actor)
    return { ok: false, reason: "NOT_CANCELLABLE" };
  const amount = toMinorUnits(order.reserveTotal ?? 0);
  const changedBy =
    input.actor?.staffUserId ?? (input.customerId ? "customer" : "system");

  const done = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: "RESERVED", balancePaidAt: null },
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
            creditCode: credit?.code ?? null,
          },
        },
        tx,
      );
    }
    return { credit };
  });
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
  /** Send a reminder to these orders. */
  remind: { orderId: string; orderNumber: string; reminder: number }[];
  /** These were cancelled and turned into credit. */
  creditMade: Extract<CancelPreorderResult, { ok: true }>[];
}

/**
 * The daily job: balance reminders after 3 and 7 days, then after 14 days
 * the reservation is cancelled and the reserve turns into a credit for a
 * year. Sending the messages is the caller's job.
 */
export async function runPreorderReminders(
  now: Date = new Date(),
): Promise<PreorderReminderRun> {
  const run: PreorderReminderRun = { remind: [], creditMade: [] };
  const open = await prisma.order.findMany({
    where: {
      kind: "PREORDER",
      status: "RESERVED",
      balanceRequestedAt: { not: null },
      balancePaidAt: null,
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      balanceRequestedAt: true,
      balanceReminderCount: true,
    },
    take: 500,
  });
  for (const order of open) {
    const days = (now.getTime() - order.balanceRequestedAt!.getTime()) / DAY_MS;
    if (days >= BALANCE_CANCEL_DAYS) {
      const cancelled = await cancelPreorder({
        orderId: order.id,
        mode: "CREDIT",
        reason: `Balance not paid within ${BALANCE_CANCEL_DAYS} days`,
        now,
      });
      if (cancelled.ok) run.creditMade.push(cancelled);
      continue;
    }
    const due = BALANCE_REMINDER_DAYS[order.balanceReminderCount];
    if (due !== undefined && days >= due) {
      const claimed = await prisma.order.updateMany({
        where: {
          id: order.id,
          balanceReminderCount: order.balanceReminderCount,
        },
        data: {
          balanceReminderCount: { increment: 1 },
          balanceRemindedAt: now,
        },
      });
      if (claimed.count === 1)
        run.remind.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          reminder: order.balanceReminderCount + 1,
        });
    }
  }
  return run;
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
