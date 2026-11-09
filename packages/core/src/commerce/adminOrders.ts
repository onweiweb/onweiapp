import { Prisma, prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import { updateOrderStatus } from "../orders/updateOrderStatus";
import type { RazorpayConfig } from "../payments/razorpay";
import { refundPayment } from "./orders";

/** Staff actions on an order. Every one writes history and an audit row. */

export class OrderActionError extends Error {}

/** Packed (if not yet) and shipped, with the courier and tracking number. */
export async function shipOrder(
  orderId: string,
  input: { courierName: string; trackingNumber: string },
  actor: AuditActor,
): Promise<void> {
  const courierName = input.courierName.trim();
  const trackingNumber = input.trackingNumber.trim();
  if (courierName.length < 2)
    throw new OrderActionError("Add the courier's name.");
  if (trackingNumber.length < 4)
    throw new OrderActionError("Add the tracking number from the courier.");
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { status: true },
  });
  if (order.status === "CONFIRMED") {
    await updateOrderStatus(
      { orderId, toStatus: "PACKED", note: "Packed" },
      actor,
    );
  } else if (order.status !== "PACKED") {
    throw new OrderActionError(
      "Only confirmed or packed orders can be shipped.",
    );
  }
  await updateOrderStatus(
    { orderId, toStatus: "SHIPPED", note: `${courierName} ${trackingNumber}` },
    actor,
  );
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { courierName, trackingNumber },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "order.tracking",
        entityType: "Order",
        entityId: orderId,
        afterState: { courierName, trackingNumber },
      },
      tx,
    );
  });
}

/** Cash on delivery: the courier handed the cash over. */
export async function markCodCollected(
  orderId: string,
  actor: AuditActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        paymentMethod: true,
        codCollectedAt: true,
        total: true,
        status: true,
      },
    });
    if (order.paymentMethod !== "COD")
      throw new OrderActionError("This order was paid online.");
    if (order.codCollectedAt)
      throw new OrderActionError("Already marked as collected.");
    if (
      ![
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "RETURN_REQUESTED",
        "RETURNED",
      ].includes(order.status)
    ) {
      throw new OrderActionError("Mark it shipped first.");
    }
    await tx.order.update({
      where: { id: orderId },
      data: { codCollectedAt: new Date() },
    });
    await tx.payment.create({
      data: {
        orderId,
        provider: "cod",
        providerPaymentId: `cod-${orderId}`,
        amount: order.total,
        status: "SUCCESS",
        method: "cod",
      },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "order.codCollected",
        entityType: "Order",
        entityId: orderId,
        afterState: { amount: order.total.toString() },
      },
      tx,
    );
  });
}

/**
 * Staff cancel a confirmed order before it ships: stock goes back, coupon
 * uses are released, and an online payment is refunded in full.
 */
export async function cancelOrderByStaff(
  orderId: string,
  reason: string,
  actor: AuditActor,
  razorpay: RazorpayConfig | null,
): Promise<{ refunded: boolean; refundProblem?: string }> {
  const clean = reason.trim();
  if (clean.length < 3)
    throw new OrderActionError("Add a short reason for the customer.");
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { status: true, paymentMethod: true, total: true, paidAt: true },
  });
  if (!["CONFIRMED", "PACKED"].includes(order.status)) {
    throw new OrderActionError(
      "Only orders that haven't shipped can be cancelled here.",
    );
  }
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "CANCELLED", cancelReason: clean },
    });
    if (claimed.count === 0)
      throw new OrderActionError("This order just changed. Refresh the page.");
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { productVariant: { select: { sku: true } } },
    });
    for (const item of items) {
      const row =
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
      if (!row) continue;
      await tx.inventory.update({
        where: { id: row.id },
        data: { quantityOnHand: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          productVariantId: item.productVariantId,
          variantSku: item.productVariant.sku,
          changeQty: item.quantity,
          reason: "ADJUSTMENT",
          actorType: "STAFF",
          actorId: actor.staffUserId,
        },
      });
    }
    await tx.couponRedemption.updateMany({
      where: { orderId, status: { in: ["RESERVED", "CONFIRMED"] } },
      data: { status: "RELEASED" },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: "CANCELLED",
        note: clean,
        changedBy: actor.staffUserId,
      },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "order.cancel",
        entityType: "Order",
        entityId: orderId,
        beforeState: { status: order.status },
        afterState: { status: "CANCELLED", reason: clean },
      },
      tx,
    );
  });

  if (order.paymentMethod !== "RAZORPAY" || !order.paidAt)
    return { refunded: false };
  const left = await refundableAmount(orderId);
  if (left <= 0) return { refunded: false };
  const refund = await refundPayment({
    orderId,
    amountPaise: left,
    note: `Cancelled: ${clean}`,
    razorpay,
    staffUserId: actor.staffUserId,
  });
  if (!refund.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        needsAttention:
          "Cancelled, but the refund didn't go through. Refund it from Razorpay or try again here.",
      },
    });
    return { refunded: false, refundProblem: refund.message ?? refund.reason };
  }
  return { refunded: true };
}

/** What's still refundable on an order's online payments, paise. */
export async function refundableAmount(orderId: string): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: {
      orderId,
      provider: "razorpay",
      status: { in: ["SUCCESS", "REFUNDED"] },
    },
  });
  return payments.reduce(
    (sum, p) => sum + toMinorUnits(p.amount) - toMinorUnits(p.refundedAmount),
    0,
  );
}

/** A goodwill or partial refund staff choose to give, paise. */
export async function refundOrderAmount(
  orderId: string,
  amountPaise: number,
  note: string,
  actor: AuditActor,
  razorpay: RazorpayConfig | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isInteger(amountPaise) || amountPaise < 100)
    return { ok: false, message: "Enter at least ₹1." };
  const left = await refundableAmount(orderId);
  if (amountPaise > left) {
    return {
      ok: false,
      message: `Only ₹${(left / 100).toLocaleString("en-IN")} is left to refund on this order.`,
    };
  }
  const result = await refundPayment({
    orderId,
    amountPaise,
    note: note.trim() || "Refund by staff",
    razorpay,
    staffUserId: actor.staffUserId,
  });
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "PAYMENT_UNAVAILABLE"
          ? "Online refunds aren't set up here. Check the Razorpay keys."
          : `Razorpay didn't accept the refund${result.message ? `: ${result.message}` : ""}.`,
    };
  }
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "order.refund",
    entityType: "Order",
    entityId: orderId,
    afterState: {
      amount: new Prisma.Decimal(amountPaise).dividedBy(100).toString(),
      note,
    },
  });
  return { ok: true };
}

export async function clearNeedsAttention(
  orderId: string,
  actor: AuditActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { needsAttention: true },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { needsAttention: null },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "order.attentionCleared",
        entityType: "Order",
        entityId: orderId,
        beforeState: before,
      },
      tx,
    );
  });
}

/** Product: can it be returned, and its tax details (HSN code, GST %). */
export async function updateProductCommerce(
  productId: string,
  input: {
    isReturnable: boolean;
    hsnCode: string | null;
    gstRate: number | null;
  },
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hsn = input.hsnCode?.replace(/\s/g, "") || null;
  if (hsn && !/^\d{4,8}$/.test(hsn))
    return { ok: false, error: "HSN codes are 4 to 8 digits." };
  if (input.gstRate !== null && !(input.gstRate >= 0 && input.gstRate <= 40)) {
    return {
      ok: false,
      error: "Enter a GST rate from 0 to 40, or leave it empty.",
    };
  }
  await prisma.$transaction(async (tx) => {
    const before = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { isReturnable: true, hsnCode: true, gstRate: true },
    });
    const after = await tx.product.update({
      where: { id: productId },
      data: {
        isReturnable: input.isReturnable,
        hsnCode: hsn,
        gstRate:
          input.gstRate === null ? null : new Prisma.Decimal(input.gstRate),
      },
      select: { isReturnable: true, hsnCode: true, gstRate: true },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "product.commerce",
        entityType: "Product",
        entityId: productId,
        beforeState: before,
        afterState: after,
      },
      tx,
    );
  });
  return { ok: true };
}

export async function setCategoryReturnable(
  categoryId: string,
  isReturnable: boolean,
  actor: AuditActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.category.findUniqueOrThrow({
      where: { id: categoryId },
      select: { isReturnable: true },
    });
    await tx.category.update({
      where: { id: categoryId },
      data: { isReturnable },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "category.returnable",
        entityType: "Category",
        entityId: categoryId,
        beforeState: before,
        afterState: { isReturnable },
      },
      tx,
    );
  });
}
