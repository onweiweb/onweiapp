import { checkDeliveryPincode } from "../logistics/orderShipments";
import { Prisma, prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import { gstPortion } from "../pricing/engine";
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayPayment,
  RazorpayError,
  type RazorpayConfig,
} from "../payments/razorpay";
import {
  getCartView,
  removeOrderedItems,
  shopIsPreorderOnly,
  type CartView,
} from "./cart";
import { variantLabelOf } from "./variantLabel";
import { getCustomerIdentity } from "./customerIdentity";
import { codAllowedFor, getStoreSettings } from "./storeSettings";

/**
 * Placing and paying for orders. docs/COMMERCE_BUILD_PLAN.md section 10.
 *
 * - The price is worked out again on the server at "Place order". If it
 *   differs from what the customer saw, nothing is created and they are shown
 *   the new total (no surprise money).
 * - Stock and coupon uses are held in the same transaction that creates the
 *   order. Two people can't both take the last item or the last coupon use.
 * - A Razorpay order stays PENDING until payment is confirmed (checkout
 *   handler or webhook, whichever is first; the second does nothing). Unpaid
 *   orders are cancelled after the hold and give stock and uses back.
 */

export const toRupees = (paise: number) =>
  new Prisma.Decimal(paise).dividedBy(100);

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      total: number;
      paymentMethod: "RAZORPAY" | "COD";
      razorpay?: {
        keyId: string;
        orderId: string;
        amount: number;
        currency: "INR";
      };
    }
  | {
      ok: false;
      reason:
        | "NOT_SIGNED_IN"
        | "PREORDER_ONLY"
        | "EMPTY_CART"
        | "CART_NEEDS_ATTENTION"
        | "ADDRESS_REQUIRED"
        | "PIN_NOT_SERVICEABLE"
        | "COD_NOT_AVAILABLE"
        | "COD_NOT_AVAILABLE_HERE"
        | "PRICE_CHANGED"
        | "OUT_OF_STOCK"
        | "COUPON_USED_UP"
        | "PAYMENT_UNAVAILABLE";
      view?: CartView;
    };

class OrderAbort extends Error {
  constructor(readonly reason: "OUT_OF_STOCK" | "COUPON_USED_UP") {
    super(reason);
  }
}

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const count = await tx.order.count();
  return `ONW${1001 + count}`;
}

export function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

/** Cancels this customer's other unpaid orders so they don't hold stock twice. */
export async function supersedePendingOrders(
  customerId: string,
): Promise<void> {
  const pending = await prisma.order.findMany({
    where: { customerId, status: "PENDING", paymentMethod: "RAZORPAY" },
    select: { id: true },
  });
  for (const order of pending) {
    await cancelUnpaidOrder(order.id, "Replaced by a newer checkout");
  }
}

export async function placeOrder(input: {
  customerId: string;
  addressId: string;
  paymentMethod: "RAZORPAY" | "COD";
  /** The total the customer saw on the review step, paise. */
  expectedTotal: number;
  razorpay: RazorpayConfig | null;
}): Promise<PlaceOrderResult> {
  await releaseExpiredOrders();
  if (await shopIsPreorderOnly()) return { ok: false, reason: "PREORDER_ONLY" };

  const identity = await getCustomerIdentity(input.customerId);
  if (!identity || (!identity.email && !identity.phone)) {
    return { ok: false, reason: "NOT_SIGNED_IN" };
  }
  const address = await prisma.address.findFirst({
    where: {
      id: input.addressId,
      customerId: input.customerId,
      deletedAt: null,
    },
  });
  if (!address) return { ok: false, reason: "ADDRESS_REQUIRED" };
  // Null when iThink can't tell us: the order goes ahead.
  const service = await checkDeliveryPincode(address.postalCode);
  if (service && !service.deliverable) {
    return { ok: false, reason: "PIN_NOT_SERVICEABLE" };
  }
  if (input.paymentMethod === "COD" && service && !service.cod) {
    return { ok: false, reason: "COD_NOT_AVAILABLE_HERE" };
  }

  await supersedePendingOrders(input.customerId);

  const settings = await getStoreSettings();
  const view = await getCartView(
    { customerId: input.customerId },
    { paymentMethod: input.paymentMethod },
  );
  if (view.lines.length === 0) return { ok: false, reason: "EMPTY_CART", view };
  if (!view.canCheckout)
    return { ok: false, reason: "CART_NEEDS_ATTENTION", view };
  if (
    input.paymentMethod === "COD" &&
    !codAllowedFor(settings, view.pricing.total)
  ) {
    return { ok: false, reason: "COD_NOT_AVAILABLE", view };
  }
  if (input.paymentMethod === "RAZORPAY" && !input.razorpay) {
    return { ok: false, reason: "PAYMENT_UNAVAILABLE", view };
  }
  if (view.pricing.total !== input.expectedTotal) {
    return { ok: false, reason: "PRICE_CHANGED", view };
  }

  const pricing = view.pricing;
  const lines = view.lines.filter((line) => line.issue === null);
  const snapshot: AddressSnapshot = {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
  const isCod = input.paymentMethod === "COD";
  const now = new Date();
  const holdUntil = new Date(
    now.getTime() + settings.paymentHoldMinutes * 60 * 1000,
  );
  const insiderDiscount = pricing.discounts
    .filter((d) => d.kind === "INSIDER")
    .reduce((sum, d) => sum + d.amount, 0);

  let order: { id: string; orderNumber: string } | null = null;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    try {
      order = await prisma.$transaction(
        async (tx) => {
          // 1. Hold stock, line by line, from a warehouse that has enough.
          const warehouses = new Map<string, string>();
          for (const line of lines) {
            const rows = await tx.$queryRaw<
              { id: string; warehouseId: string }[]
            >`
              UPDATE "Inventory" SET "quantityReserved" = "quantityReserved" + ${line.quantity}
              WHERE "id" = (
                SELECT "id" FROM "Inventory"
                WHERE "productVariantId" = ${line.variantId}
                  AND "quantityOnHand" - "quantityReserved" >= ${line.quantity}
                ORDER BY "quantityOnHand" - "quantityReserved" DESC
                LIMIT 1
                FOR UPDATE
              )
              AND "quantityOnHand" - "quantityReserved" >= ${line.quantity}
              RETURNING "id", "warehouseId"`;
            const row = rows[0];
            if (!row) throw new OrderAbort("OUT_OF_STOCK");
            warehouses.set(line.variantId, row.warehouseId);
          }

          // 1b. Free items from coupons: held if in stock, otherwise left
          // out (the order still goes through).
          const freeLines: {
            variantId: string;
            quantity: number;
            warehouseId: string;
            reason: string;
          }[] = [];
          for (const free of pricing.freeItems) {
            if (!free.available) continue;
            const rows = await tx.$queryRaw<{ warehouseId: string }[]>`
              UPDATE "Inventory" SET "quantityReserved" = "quantityReserved" + ${free.quantity}
              WHERE "id" = (
                SELECT "id" FROM "Inventory"
                WHERE "productVariantId" = ${free.variantId}
                  AND "quantityOnHand" - "quantityReserved" >= ${free.quantity}
                ORDER BY "quantityOnHand" - "quantityReserved" DESC
                LIMIT 1
                FOR UPDATE
              )
              AND "quantityOnHand" - "quantityReserved" >= ${free.quantity}
              RETURNING "warehouseId"`;
            if (rows[0])
              freeLines.push({
                variantId: free.variantId,
                quantity: free.quantity,
                warehouseId: rows[0].warehouseId,
                reason: `Free with ${free.code}`,
              });
          }
          const freeVariants = freeLines.length
            ? await tx.productVariant.findMany({
                where: { id: { in: freeLines.map((f) => f.variantId) } },
                include: { product: { select: { name: true } } },
              })
            : [];

          // 2. Hold coupon uses, re-checking limits under a row lock.
          const couponDiscounts = pricing.discounts.filter((d) => d.couponId);
          for (const discount of couponDiscounts) {
            const locked = await tx.$queryRaw<
              { usageLimit: number | null; perCustomerLimit: number | null }[]
            >`SELECT "usageLimit", "perCustomerLimit" FROM "Coupon" WHERE "id" = ${discount.couponId} FOR UPDATE`;
            const coupon = locked[0];
            if (!coupon) throw new OrderAbort("COUPON_USED_UP");
            if (coupon.usageLimit !== null) {
              const used = await tx.couponRedemption.count({
                where: {
                  couponId: discount.couponId!,
                  status: { in: ["RESERVED", "CONFIRMED"] },
                },
              });
              if (used >= coupon.usageLimit)
                throw new OrderAbort("COUPON_USED_UP");
            }
            if (coupon.perCustomerLimit !== null) {
              const or: Prisma.CouponRedemptionWhereInput[] = [
                { customerId: identity.id },
              ];
              if (identity.email) or.push({ customerEmail: identity.email });
              if (identity.phone) or.push({ customerPhone: identity.phone });
              const mine = await tx.couponRedemption.count({
                where: {
                  couponId: discount.couponId!,
                  status: { in: ["RESERVED", "CONFIRMED"] },
                  OR: or,
                },
              });
              if (mine >= coupon.perCustomerLimit)
                throw new OrderAbort("COUPON_USED_UP");
            }
          }

          // 3. The order, with every price and discount as it is now.
          const orderNumber = await nextOrderNumber(tx);
          const created = await tx.order.create({
            data: {
              orderNumber,
              customerId: identity.id,
              status: isCod ? "CONFIRMED" : "PENDING",
              paymentMethod: input.paymentMethod,
              subtotal: toRupees(pricing.subtotal),
              discountTotal: toRupees(pricing.discountTotal),
              insiderDiscount: toRupees(insiderDiscount),
              shippingTotal: toRupees(pricing.shippingFee),
              codFee: toRupees(pricing.codFee),
              taxTotal: toRupees(
                lines.reduce(
                  (sum, line) =>
                    sum + gstPortion(line.total, line.gstRate ?? 0),
                  0,
                ),
              ),
              total: toRupees(pricing.total),
              shippingAddressId: address.id,
              billingAddressId: address.id,
              shippingAddressSnapshot:
                snapshot as unknown as Prisma.InputJsonValue,
              contactEmail: identity.email,
              contactPhone: identity.phone ?? (address.phone || null),
              couponCode: couponDiscounts.map((d) => d.code).join(", ") || null,
              reservationExpiresAt: isCod ? null : holdUntil,
              items: {
                create: [
                  ...freeLines.flatMap((free) => {
                    const variant = freeVariants.find(
                      (v) => v.id === free.variantId,
                    );
                    if (!variant) return [];
                    return [
                      {
                        productVariantId: variant.id,
                        quantity: free.quantity,
                        unitPrice: toRupees(0),
                        totalAmount: toRupees(0),
                        productName: variant.product.name,
                        variantLabel: variantLabelOf(variant.attributes),
                        sku: variant.sku,
                        isReturnable: false,
                        isFree: true,
                        freeReason: free.reason,
                        warehouseId: free.warehouseId,
                      },
                    ];
                  }),
                  ...lines.map((line) => ({
                    productVariantId: line.variantId,
                    quantity: line.quantity,
                    unitPrice: toRupees(line.unitPrice),
                    discountAmount: toRupees(line.discount),
                    taxAmount: toRupees(
                      gstPortion(line.total, line.gstRate ?? 0),
                    ),
                    totalAmount: toRupees(line.total),
                    productName: line.productName,
                    variantLabel: line.variantLabel,
                    sku: line.sku,
                    imageUrl: line.imageUrl,
                    gstRate:
                      line.gstRate === null
                        ? null
                        : new Prisma.Decimal(line.gstRate),
                    isReturnable: line.isReturnable,
                    wasOnSale:
                      line.compareAtPrice !== null &&
                      line.compareAtPrice > line.unitPrice,
                    warehouseId: warehouses.get(line.variantId) ?? null,
                  })),
                ],
              },
              discounts: {
                create: pricing.discounts.map((d) => ({
                  kind: d.kind,
                  couponId: d.couponId,
                  code: d.code,
                  label: d.label,
                  amount: toRupees(d.amount),
                  freeShipping: d.freeShipping,
                })),
              },
              statusHistory: {
                create: [
                  {
                    status: "PENDING",
                    note: isCod ? "Cash on delivery" : "Waiting for payment",
                    changedBy: "customer",
                  },
                  ...(isCod
                    ? [
                        {
                          status: "CONFIRMED" as const,
                          note: "Cash on delivery order placed",
                          changedBy: "system",
                        },
                      ]
                    : []),
                ],
              },
            },
            select: { id: true, orderNumber: true },
          });

          for (const discount of couponDiscounts) {
            await tx.couponRedemption.create({
              data: {
                couponId: discount.couponId!,
                orderId: created.id,
                customerId: identity.id,
                customerEmail: identity.email,
                customerPhone: identity.phone,
                discountAmount: toRupees(discount.amount),
                status: isCod ? "CONFIRMED" : "RESERVED",
              },
            });
          }

          // 4. Cash on delivery is a sale straight away.
          if (isCod) {
            await convertHoldToSale(tx, created.id);
            await removeOrderedItems(
              identity.id,
              lines.map((l) => l.variantId),
              tx,
            );
          }
          return created;
        },
        { timeout: 20_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (error instanceof OrderAbort) {
        return {
          ok: false,
          reason: error.reason,
          view: await getCartView(
            { customerId: input.customerId },
            { paymentMethod: input.paymentMethod },
          ),
        };
      }
      if (isUniqueViolation(error, "orderNumber")) continue;
      throw error;
    }
  }
  if (!order) throw new Error("Could not create the order");

  if (isCod) {
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: pricing.total,
      paymentMethod: "COD",
    };
  }

  try {
    const rzp = await createRazorpayOrder(input.razorpay!, {
      amountPaise: pricing.total,
      receipt: order.orderNumber,
      notes: { orderId: order.id },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzp.id },
    });
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: pricing.total,
      paymentMethod: "RAZORPAY",
      razorpay: {
        keyId: input.razorpay!.keyId,
        orderId: rzp.id,
        amount: pricing.total,
        currency: "INR",
      },
    };
  } catch (error) {
    console.error("[orders] razorpay order failed", error);
    await cancelUnpaidOrder(order.id, "Payment could not be started");
    return { ok: false, reason: "PAYMENT_UNAVAILABLE", view };
  }
}

/** Held stock becomes sold stock, with a SALE log per line. */
export async function convertHoldToSale(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { productVariant: { select: { sku: true } } },
  });
  for (const item of items) {
    if (!item.warehouseId) continue;
    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "quantityOnHand" = "quantityOnHand" - ${item.quantity},
          "quantityReserved" = GREATEST("quantityReserved" - ${item.quantity}, 0)
      WHERE "productVariantId" = ${item.productVariantId} AND "warehouseId" = ${item.warehouseId}`;
    await tx.inventoryLog.create({
      data: {
        productVariantId: item.productVariantId,
        variantSku: item.productVariant.sku,
        changeQty: -item.quantity,
        reason: "SALE",
        actorType: "SYSTEM",
      },
    });
  }
}

export async function releaseHold(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (!item.warehouseId) continue;
    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "quantityReserved" = GREATEST("quantityReserved" - ${item.quantity}, 0)
      WHERE "productVariantId" = ${item.productVariantId} AND "warehouseId" = ${item.warehouseId}`;
  }
  await tx.couponRedemption.updateMany({
    where: { orderId, status: "RESERVED" },
    data: { status: "RELEASED" },
  });
}

/** Cancels an order still waiting for payment; gives stock and uses back. */
export async function cancelUnpaidOrder(
  orderId: string,
  reason: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        reservationExpiresAt: null,
      },
    });
    if (claimed.count === 0) return false;
    await releaseHold(tx, orderId);
    await tx.orderStatusHistory.create({
      data: { orderId, status: "CANCELLED", note: reason, changedBy: "system" },
    });
    return true;
  });
}

/** Cancels unpaid orders whose hold has run out. Safe to call often. */
export async function releaseExpiredOrders(
  now: Date = new Date(),
): Promise<number> {
  const expired = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "RAZORPAY",
      reservationExpiresAt: { lt: now },
    },
    select: { id: true },
    take: 50,
  });
  let released = 0;
  for (const order of expired) {
    if (await cancelUnpaidOrder(order.id, "Payment not completed in time"))
      released++;
  }
  return released;
}

export type MarkPaidResult =
  | {
      ok: true;
      /** RESERVED: a pre-order's reserve was paid. */
      status: "CONFIRMED" | "RESERVED" | "ALREADY_CONFIRMED";
      orderId: string;
      orderNumber: string;
    }
  | { ok: true; status: "REFUNDING"; orderId: string; orderNumber: string }
  | { ok: false; reason: "NOT_FOUND" | "AMOUNT_MISMATCH" };

/**
 * A captured Razorpay payment. Called by the checkout handler and by the
 * webhook; whichever comes second finds the payment already recorded and
 * changes nothing. Paid after the hold expired, or paid twice: the money is
 * refunded automatically and the order is flagged for staff.
 */
/**
 * Which order a Razorpay order pays for, and what it should pay. A normal
 * order pays its total. A pre-order pays twice: the reserve (its first
 * Razorpay order, while PENDING) and later the balance (its own Razorpay
 * order, while RESERVED).
 */
async function paymentTarget(razorpayOrderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ razorpayOrderId }, { balanceRazorpayOrderId: razorpayOrderId }],
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      customerId: true,
      kind: true,
      reserveTotal: true,
      balanceDue: true,
      balanceRazorpayOrderId: true,
    },
  });
  if (!order) return null;
  const stage =
    order.kind !== "PREORDER"
      ? ("FULL" as const)
      : order.balanceRazorpayOrderId === razorpayOrderId
        ? ("BALANCE" as const)
        : ("RESERVE" as const);
  const expected =
    stage === "RESERVE"
      ? toMinorUnits(order.reserveTotal ?? 0)
      : stage === "BALANCE"
        ? toMinorUnits(order.balanceDue ?? 0)
        : toMinorUnits(order.total);
  const waitingStatus = stage === "BALANCE" ? "RESERVED" : "PENDING";
  return { order, stage, expected, waitingStatus } as const;
}

export async function markOrderPaid(input: {
  razorpayOrderId: string;
  paymentId: string;
  amountPaise: number;
  method?: string | null;
  razorpay: RazorpayConfig | null;
}): Promise<MarkPaidResult> {
  const target = await paymentTarget(input.razorpayOrderId);
  if (!target) return { ok: false, reason: "NOT_FOUND" };
  const { order, stage } = target;

  const existing = await prisma.payment.findUnique({
    where: {
      provider_providerPaymentId: {
        provider: "razorpay",
        providerPaymentId: input.paymentId,
      },
    },
  });
  if (existing?.status === "SUCCESS" || existing?.status === "REFUNDED") {
    return {
      ok: true,
      status: "ALREADY_CONFIRMED",
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  if (input.amountPaise !== target.expected) {
    await prisma.$transaction(async (tx) => {
      await upsertPayment(tx, order.id, input, "SUCCESS");
      await tx.order.update({
        where: { id: order.id },
        data: {
          needsAttention:
            "Payment amount doesn't match the order total. Check in Razorpay before shipping.",
        },
      });
    });
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }

  const outcome = await prisma.$transaction(async (tx) => {
    await upsertPayment(tx, order.id, input, "SUCCESS");
    if (stage === "RESERVE") {
      const reserved = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: "RESERVED",
          paidAt: new Date(),
          reservationExpiresAt: null,
        },
      });
      if (reserved.count === 1) {
        await tx.couponRedemption.updateMany({
          where: { orderId: order.id, status: "RESERVED" },
          data: { status: "CONFIRMED" },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "RESERVED",
            note: "Reserve paid online",
            changedBy: "system",
          },
        });
        return "RESERVED" as const;
      }
    }
    if (stage === "BALANCE") {
      const balance = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "RESERVED",
          balanceRequestedAt: { not: null },
        },
        data: { status: "CONFIRMED", balancePaidAt: new Date() },
      });
      if (balance.count === 1) {
        await convertHoldToSale(tx, order.id);
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CONFIRMED",
            note: "Balance paid online",
            changedBy: "system",
          },
        });
        return "CONFIRMED" as const;
      }
    }
    const claimed =
      stage === "FULL"
        ? await tx.order.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: {
              status: "CONFIRMED",
              paidAt: new Date(),
              reservationExpiresAt: null,
            },
          })
        : { count: 0 };
    if (claimed.count === 1) {
      await convertHoldToSale(tx, order.id);
      await tx.couponRedemption.updateMany({
        where: { orderId: order.id, status: "RESERVED" },
        data: { status: "CONFIRMED" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CONFIRMED",
          note: "Paid online",
          changedBy: "system",
        },
      });
      const items = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { productVariantId: true },
      });
      await removeOrderedItems(
        order.customerId,
        items.map((i) => i.productVariantId),
        tx,
      );
      return "CONFIRMED" as const;
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        needsAttention:
          order.status === "CANCELLED"
            ? "Paid after the payment window closed. The payment is being refunded automatically."
            : "This order was paid twice. The second payment is being refunded automatically.",
      },
    });
    return "REFUND" as const;
  });

  if (outcome === "CONFIRMED" || outcome === "RESERVED") {
    return {
      ok: true,
      status: outcome,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }
  await refundPayment({
    orderId: order.id,
    paymentId: input.paymentId,
    amountPaise: input.amountPaise,
    note: "Automatic refund: payment arrived after the order was closed or was a duplicate",
    razorpay: input.razorpay,
    staffUserId: null,
  });
  return {
    ok: true,
    status: "REFUNDING",
    orderId: order.id,
    orderNumber: order.orderNumber,
  };
}

async function upsertPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  input: {
    razorpayOrderId: string;
    paymentId: string;
    amountPaise: number;
    method?: string | null;
  },
  status: "SUCCESS" | "FAILED",
  errorReason?: string,
): Promise<void> {
  await tx.payment.upsert({
    where: {
      provider_providerPaymentId: {
        provider: "razorpay",
        providerPaymentId: input.paymentId,
      },
    },
    create: {
      orderId,
      provider: "razorpay",
      providerPaymentId: input.paymentId,
      providerOrderId: input.razorpayOrderId,
      amount: toRupees(input.amountPaise),
      status,
      method: input.method ?? null,
      errorReason: errorReason ?? null,
    },
    update:
      status === "SUCCESS"
        ? { status, method: input.method ?? undefined, errorReason: null }
        : {},
  });
}

/** A failed attempt. The order stays open so the customer can try again. */
export async function markPaymentFailed(input: {
  razorpayOrderId: string;
  paymentId: string;
  amountPaise: number;
  method?: string | null;
  reason?: string | null;
}): Promise<void> {
  const target = await paymentTarget(input.razorpayOrderId);
  if (!target) return;
  await prisma.$transaction(async (tx) => {
    await upsertPayment(
      tx,
      target.order.id,
      input,
      "FAILED",
      input.reason ?? undefined,
    );
  });
}

export type RefundResult =
  | { ok: true; refundId: string; status: "PENDING" | "PROCESSED" }
  | {
      ok: false;
      reason:
        "TOO_MUCH" | "NOT_PAID" | "PAYMENT_UNAVAILABLE" | "PROVIDER_ERROR";
      message?: string;
    };

/**
 * Refunds money on a Razorpay payment (never more than is left on it) and
 * records it. Used for returns, cancellations, and automatic refunds.
 */
export async function refundPayment(input: {
  orderId: string;
  paymentId?: string;
  amountPaise: number;
  note: string;
  razorpay: RazorpayConfig | null;
  staffUserId: string | null;
  returnRequestId?: string;
}): Promise<RefundResult> {
  const payment = await prisma.payment.findFirst({
    where: {
      orderId: input.orderId,
      provider: "razorpay",
      status: { in: ["SUCCESS", "REFUNDED"] },
      ...(input.paymentId ? { providerPaymentId: input.paymentId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  if (!payment) return { ok: false, reason: "NOT_PAID" };
  const left =
    toMinorUnits(payment.amount) - toMinorUnits(payment.refundedAmount);
  if (input.amountPaise <= 0 || input.amountPaise > left)
    return { ok: false, reason: "TOO_MUCH" };
  if (!input.razorpay) return { ok: false, reason: "PAYMENT_UNAVAILABLE" };

  try {
    const refund = await createRazorpayRefund(input.razorpay, {
      paymentId: payment.providerPaymentId,
      amountPaise: input.amountPaise,
      notes: { orderId: input.orderId },
    });
    const row = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: { increment: toRupees(input.amountPaise) },
          status: input.amountPaise === left ? "REFUNDED" : payment.status,
        },
      });
      return tx.refund.create({
        data: {
          orderId: input.orderId,
          paymentId: payment.id,
          returnRequestId: input.returnRequestId ?? null,
          amount: toRupees(input.amountPaise),
          method: "RAZORPAY",
          status: refund.status === "processed" ? "PROCESSED" : "PENDING",
          providerRefundId: refund.id,
          note: input.note,
          createdByStaffId: input.staffUserId,
          processedAt: refund.status === "processed" ? new Date() : null,
        },
      });
    });
    return {
      ok: true,
      refundId: row.id,
      status: row.status === "PROCESSED" ? "PROCESSED" : "PENDING",
    };
  } catch (error) {
    console.error("[orders] refund failed", error);
    return {
      ok: false,
      reason: "PROVIDER_ERROR",
      message: error instanceof RazorpayError ? error.message : undefined,
    };
  }
}

/** Razorpay webhook: a refund finished (or failed). */
export async function markRefundStatus(
  providerRefundId: string,
  status: "PROCESSED" | "FAILED",
): Promise<void> {
  await prisma.refund.updateMany({
    where: { providerRefundId },
    data: { status, processedAt: status === "PROCESSED" ? new Date() : null },
  });
}

/** For "Try payment again": the open Razorpay order, if still within the hold. */
export async function getRetryPayment(
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
      status: "PENDING",
      paymentMethod: "RAZORPAY",
    },
    select: {
      razorpayOrderId: true,
      total: true,
      kind: true,
      reserveTotal: true,
      reservationExpiresAt: true,
      orderNumber: true,
    },
  });
  if (!order?.razorpayOrderId) return null;
  if (order.reservationExpiresAt && order.reservationExpiresAt < new Date())
    return null;
  return {
    keyId: razorpay.keyId,
    orderId: order.razorpayOrderId,
    amount: toMinorUnits(
      order.kind === "PREORDER" ? (order.reserveTotal ?? 0) : order.total,
    ),
    orderNumber: order.orderNumber,
  };
}

export type ConfirmPaymentResult =
  | MarkPaidResult
  | { ok: true; status: "PROCESSING" | "FAILED" }
  | { ok: false; reason: "WRONG_ORDER" | "PROVIDER_ERROR" };

/**
 * Works out what happened to a Razorpay payment and acts on it. Used by the
 * checkout success handler and the webhook. If Razorpay only authorized the
 * payment (auto-capture off on the account), we capture it here, but only
 * when the order is still waiting and the amount is exactly the order total.
 * A payment for an order that's no longer waiting is left uncaptured, and
 * Razorpay gives the money back by itself.
 */
export async function confirmRazorpayPayment(input: {
  razorpayOrderId: string;
  paymentId: string;
  razorpay: RazorpayConfig;
}): Promise<ConfirmPaymentResult> {
  let payment;
  try {
    payment = await fetchRazorpayPayment(input.razorpay, input.paymentId);
  } catch (error) {
    console.error("[orders] could not read payment", error);
    return { ok: false, reason: "PROVIDER_ERROR" };
  }
  if (payment.order_id !== input.razorpayOrderId)
    return { ok: false, reason: "WRONG_ORDER" };

  if (payment.status === "failed") {
    await markPaymentFailed({
      razorpayOrderId: input.razorpayOrderId,
      paymentId: payment.id,
      amountPaise: payment.amount,
      method: payment.method,
      reason: null,
    });
    return { ok: true, status: "FAILED" };
  }

  if (payment.status === "authorized") {
    const target = await paymentTarget(input.razorpayOrderId);
    if (
      !target ||
      target.order.status !== target.waitingStatus ||
      payment.amount !== target.expected
    ) {
      return { ok: true, status: "PROCESSING" };
    }
    try {
      payment = await captureRazorpayPayment(
        input.razorpay,
        payment.id,
        payment.amount,
      );
    } catch (error) {
      // Someone else (the webhook, or auto-capture) may have captured it.
      payment = await fetchRazorpayPayment(
        input.razorpay,
        input.paymentId,
      ).catch(() => payment!);
      if (payment.status !== "captured") {
        console.error("[orders] capture failed", error);
        return { ok: true, status: "PROCESSING" };
      }
    }
  }

  if (payment.status !== "captured") return { ok: true, status: "PROCESSING" };
  return markOrderPaid({
    razorpayOrderId: input.razorpayOrderId,
    paymentId: payment.id,
    amountPaise: payment.amount,
    method: payment.method,
    razorpay: input.razorpay,
  });
}
