import { Prisma, prisma, type ReturnStatus } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import type { RazorpayConfig } from "../payments/razorpay";
import { getCustomerOrder } from "./account";
import { refundPayment } from "./orders";
import { getStoreSettings } from "./storeSettings";

/**
 * Returns, docs/COMMERCE_BUILD_PLAN.md section 9. The customer asks from
 * their order page; staff approve or reject, mark it picked up and received
 * (stock goes back only when received in good condition), then refund or
 * send the exchange. Every money and stock step writes an audit row.
 *
 * Refund amount = what the customer actually paid for those units (their
 * share of every discount), never the list price (coupon safety rule 11).
 */

const toRupees = (paise: number) => new Prisma.Decimal(paise).dividedBy(100);
const UPI = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export type RequestReturnResult =
  | { ok: true; count: number }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "NOTHING_SELECTED"
        | "TOO_MANY"
        | "NOT_RETURNABLE"
        | "INVALID_REASON"
        | "RESOLUTION_NOT_OFFERED"
        | "UPI_REQUIRED";
    };

export async function requestReturn(input: {
  customerId: string;
  orderNumber: string;
  items: { orderItemId: string; quantity: number }[];
  reason: string;
  resolution: "REFUND" | "EXCHANGE";
  note?: string;
  payoutUpi?: string;
}): Promise<RequestReturnResult> {
  const order = await getCustomerOrder(input.customerId, input.orderNumber);
  if (!order) return { ok: false, reason: "NOT_FOUND" };
  const settings = await getStoreSettings();
  const wanted = input.items.filter((item) => item.quantity > 0);
  if (wanted.length === 0) return { ok: false, reason: "NOTHING_SELECTED" };
  if (!settings.returnReasons.includes(input.reason))
    return { ok: false, reason: "INVALID_REASON" };
  if (input.resolution === "REFUND" && !settings.returnsAllowRefund)
    return { ok: false, reason: "RESOLUTION_NOT_OFFERED" };
  if (input.resolution === "EXCHANGE" && !settings.returnsAllowExchange)
    return { ok: false, reason: "RESOLUTION_NOT_OFFERED" };
  const upi = input.payoutUpi?.trim();
  if (
    input.resolution === "REFUND" &&
    order.paymentMethod === "COD" &&
    (!upi || !UPI.test(upi))
  ) {
    return { ok: false, reason: "UPI_REQUIRED" };
  }

  const dbOrder = await prisma.order.findFirstOrThrow({
    where: { customerId: input.customerId, orderNumber: input.orderNumber },
    select: {
      id: true,
      status: true,
      items: { select: { id: true, quantity: true, totalAmount: true } },
      returnRequests: {
        select: {
          orderItemId: true,
          quantity: true,
          refundAmount: true,
          status: true,
        },
      },
    },
  });

  const rows: Prisma.ReturnRequestCreateManyInput[] = [];
  for (const want of wanted) {
    const detail = order.items.find((item) => item.id === want.orderItemId);
    if (!detail) return { ok: false, reason: "NOT_FOUND" };
    if (detail.returnBlockedReason)
      return { ok: false, reason: "NOT_RETURNABLE" };
    if (
      !Number.isInteger(want.quantity) ||
      want.quantity > detail.returnableQuantity
    ) {
      return { ok: false, reason: "TOO_MANY" };
    }
    const item = dbOrder.items.find((i) => i.id === want.orderItemId)!;
    const lineTotal = toMinorUnits(item.totalAmount);
    const previous = dbOrder.returnRequests.filter(
      (r) => r.orderItemId === item.id && r.status !== "REJECTED",
    );
    const previousQty = previous.reduce((sum, r) => sum + r.quantity, 0);
    const previousRefund = previous.reduce(
      (sum, r) => sum + (r.refundAmount ? toMinorUnits(r.refundAmount) : 0),
      0,
    );
    // The last units of a line take whatever paise are left, so a full
    // return always refunds exactly what was paid.
    const refund =
      previousQty + want.quantity === item.quantity
        ? lineTotal - previousRefund
        : Math.floor((lineTotal * want.quantity) / item.quantity);
    rows.push({
      orderId: dbOrder.id,
      orderItemId: item.id,
      quantity: want.quantity,
      reason: input.reason,
      resolution: input.resolution,
      customerNote: input.note?.trim().slice(0, 500) || null,
      refundAmount: input.resolution === "REFUND" ? toRupees(refund) : null,
      payoutUpi:
        order.paymentMethod === "COD" && input.resolution === "REFUND"
          ? upi
          : null,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.createMany({ data: rows });
    const moved = await tx.order.updateMany({
      where: { id: dbOrder.id, status: "DELIVERED" },
      data: { status: "RETURN_REQUESTED" },
    });
    if (moved.count === 1) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: dbOrder.id,
          status: "RETURN_REQUESTED",
          note: "Customer asked for a return",
          changedBy: "customer",
        },
      });
    }
  });
  return { ok: true, count: rows.length };
}

// ------------------------------------------------------------- staff side

export class ReturnActionError extends Error {}

async function moveReturn(
  returnId: string,
  from: ReturnStatus[],
  to: ReturnStatus,
  actor: AuditActor,
  extra: Prisma.ReturnRequestUpdateManyMutationInput = {},
  inTx?: (
    tx: Prisma.TransactionClient,
    row: { orderId: string; orderItemId: string; quantity: number },
  ) => Promise<void>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.returnRequest.findUnique({
      where: { id: returnId },
    });
    if (!before) throw new ReturnActionError("This return no longer exists.");
    const claimed = await tx.returnRequest.updateMany({
      where: { id: returnId, status: { in: from } },
      data: { status: to, ...extra },
    });
    if (claimed.count === 0) {
      throw new ReturnActionError(
        `This return is already ${before.status.toLowerCase().replace("_", " ")}. Refresh the page.`,
      );
    }
    if (inTx) await inTx(tx, before);
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: `return.${to.toLowerCase()}`,
        entityType: "ReturnRequest",
        entityId: returnId,
        beforeState: { status: before.status },
        afterState: { status: to, ...JSON.parse(JSON.stringify(extra)) },
      },
      tx,
    );
  });
}

/** Accepts the request. Nothing is restocked until the item is back. */
export async function approveReturnRequest(
  returnId: string,
  actor: AuditActor,
): Promise<void> {
  await moveReturn(returnId, ["REQUESTED"], "APPROVED", actor, {
    resolvedAt: new Date(),
  });
}

export async function rejectReturnRequest(
  returnId: string,
  reason: string,
  actor: AuditActor,
): Promise<void> {
  const clean = reason.trim();
  if (clean.length < 3)
    throw new ReturnActionError("Tell the customer why, in a short sentence.");
  await moveReturn(returnId, ["REQUESTED"], "REJECTED", actor, {
    resolvedAt: new Date(),
    rejectionReason: clean.slice(0, 300),
  });
  await settleOrderAfterReturns(returnId);
}

export async function markReturnPickedUp(
  returnId: string,
  actor: AuditActor,
): Promise<void> {
  await moveReturn(returnId, ["APPROVED"], "PICKED_UP", actor);
}

/**
 * The item is back with us. In good condition it goes back into stock (once,
 * even if pressed twice); otherwise it's received without restocking.
 */
export async function markReturnReceived(
  returnId: string,
  restock: boolean,
  actor: AuditActor,
): Promise<void> {
  await moveReturn(
    returnId,
    ["APPROVED", "PICKED_UP"],
    "RECEIVED",
    actor,
    { receivedAt: new Date(), restocked: restock },
    async (tx, row) => {
      if (!restock) return;
      const item = await tx.orderItem.findUniqueOrThrow({
        where: { id: row.orderItemId },
        include: { productVariant: { select: { sku: true } } },
      });
      const inventory =
        (item.warehouseId
          ? await tx.inventory.findUnique({
              where: {
                productVariantId_warehouseId: {
                  productVariantId: item.productVariantId,
                  warehouseId: item.warehouseId,
                },
              },
            })
          : null) ??
        (await tx.inventory.findFirst({
          where: { productVariantId: item.productVariantId },
        }));
      if (!inventory)
        throw new ReturnActionError(
          "There's no stock record for this item to put it back into.",
        );
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantityOnHand: { increment: row.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          productVariantId: item.productVariantId,
          variantSku: item.productVariant.sku,
          changeQty: row.quantity,
          reason: "RETURN",
          actorType: "STAFF",
          actorId: actor.staffUserId,
        },
      });
    },
  );
}

/**
 * Pays the customer back. Online orders: refunded through Razorpay to the
 * way they paid. Cash on delivery: staff send it to the customer's UPI and
 * this records that it was done.
 */
export async function refundReturn(
  returnId: string,
  actor: AuditActor,
  razorpay: RazorpayConfig | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: { order: { select: { id: true, paymentMethod: true } } },
  });
  if (!row) return { ok: false, message: "This return no longer exists." };
  if (row.status !== "RECEIVED")
    return { ok: false, message: "Mark the item as received first." };
  if (row.resolution !== "REFUND" || !row.refundAmount) {
    return {
      ok: false,
      message: "This return is for an exchange, not a refund.",
    };
  }
  const amount = toMinorUnits(row.refundAmount);

  if (row.order.paymentMethod === "RAZORPAY") {
    const refund = await refundPayment({
      orderId: row.order.id,
      amountPaise: amount,
      note: `Return ${returnId}`,
      razorpay,
      staffUserId: actor.staffUserId,
      returnRequestId: returnId,
    });
    if (!refund.ok) {
      return {
        ok: false,
        message:
          refund.reason === "PAYMENT_UNAVAILABLE"
            ? "Online refunds aren't set up here. Check the Razorpay keys."
            : refund.reason === "TOO_MUCH"
              ? "That's more than is left on this payment."
              : `Razorpay didn't accept the refund${refund.message ? `: ${refund.message}` : ""}.`,
      };
    }
  } else {
    await prisma.refund.create({
      data: {
        orderId: row.order.id,
        returnRequestId: returnId,
        amount: row.refundAmount,
        method: "MANUAL",
        status: "PROCESSED",
        processedAt: new Date(),
        note: row.payoutUpi
          ? `Sent to UPI ${row.payoutUpi}`
          : "Paid back by staff",
        createdByStaffId: actor.staffUserId,
      },
    });
  }
  await moveReturn(returnId, ["RECEIVED"], "REFUNDED", actor, {
    resolvedAt: new Date(),
  });
  await settleOrderAfterReturns(returnId);
  return { ok: true };
}

export async function markReturnExchanged(
  returnId: string,
  note: string,
  actor: AuditActor,
): Promise<void> {
  await moveReturn(returnId, ["RECEIVED"], "EXCHANGED", actor, {
    exchangeNote: note.trim().slice(0, 300) || null,
    resolvedAt: new Date(),
  });
  await settleOrderAfterReturns(returnId);
}

/** When every return on an order is finished, the order reads "Returned". */
async function settleOrderAfterReturns(returnId: string): Promise<void> {
  const row = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { orderId: true },
  });
  if (!row) return;
  const open = await prisma.returnRequest.count({
    where: {
      orderId: row.orderId,
      status: { in: ["REQUESTED", "APPROVED", "PICKED_UP", "RECEIVED"] },
    },
  });
  if (open > 0) return;
  const done = await prisma.returnRequest.count({
    where: { orderId: row.orderId, status: { in: ["REFUNDED", "EXCHANGED"] } },
  });
  await prisma.$transaction(async (tx) => {
    const to = done > 0 ? "RETURNED" : "DELIVERED";
    const moved = await tx.order.updateMany({
      where: { id: row.orderId, status: "RETURN_REQUESTED" },
      data: { status: to },
    });
    if (moved.count === 1) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: row.orderId,
          status: to,
          note: done > 0 ? "Return finished" : "Return request closed",
          changedBy: "system",
        },
      });
    }
  });
}
