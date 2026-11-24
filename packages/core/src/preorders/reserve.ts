import { checkDeliveryPincode } from "../logistics/orderShipments";
import { Prisma, prisma } from "@onwei/database";
import {
  getCustomerIdentity,
  getInsiderStatus,
} from "../commerce/customerIdentity";
import {
  cancelUnpaidOrder,
  isUniqueViolation,
  nextOrderNumber,
  releaseExpiredOrders,
  supersedePendingOrders,
  toRupees,
  type AddressSnapshot,
} from "../commerce/orders";
import { getStoreSettings } from "../commerce/storeSettings";
import { createRazorpayOrder, type RazorpayConfig } from "../payments/razorpay";
import { gstPortion } from "../pricing/engine";
import { quotePreorder, type PreorderQuote } from "./quote";

/**
 * Reserving a pre-order: the customer pays the reserve (per item) online.
 * No stock is taken now (there is no cap and the stock may not exist yet);
 * it is held when staff ask for the balance. Tier, discounts and gifts are
 * saved on the order as they are now.
 */

export type PlacePreorderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      reserveTotal: number;
      razorpay: {
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
        | "ADDRESS_REQUIRED"
        | "PIN_NOT_SERVICEABLE"
        | "NOT_OPEN"
        | "NOT_AVAILABLE"
        | "INVALID_QUANTITY"
        | "PRICE_CHANGED"
        | "COUPON_USED_UP"
        | "PAYMENT_UNAVAILABLE";
      quote?: PreorderQuote;
    };

class CouponUsedUp extends Error {}

export async function placePreorder(input: {
  customerId: string;
  addressId: string;
  variantId: string;
  quantity: number;
  codes: readonly string[];
  /** The amount due now that the customer saw, paise. */
  expectedReserve: number;
  /** The full total the customer saw, paise. */
  expectedTotal: number;
  razorpay: RazorpayConfig | null;
}): Promise<PlacePreorderResult> {
  await releaseExpiredOrders();
  if (!input.razorpay) return { ok: false, reason: "PAYMENT_UNAVAILABLE" };

  const identity = await getCustomerIdentity(input.customerId);
  if (!identity || (!identity.email && !identity.phone))
    return { ok: false, reason: "NOT_SIGNED_IN" };
  const address = await prisma.address.findFirst({
    where: {
      id: input.addressId,
      customerId: input.customerId,
      deletedAt: null,
    },
  });
  if (!address) return { ok: false, reason: "ADDRESS_REQUIRED" };
  const service = await checkDeliveryPincode(address.postalCode);
  if (service && !service.deliverable) {
    return { ok: false, reason: "PIN_NOT_SERVICEABLE" };
  }

  const insider = await getInsiderStatus(identity);
  const result = await quotePreorder({
    variantId: input.variantId,
    quantity: input.quantity,
    customerId: input.customerId,
    codes: input.codes,
    identity,
    insider,
  });
  if (!result.ok) return { ok: false, reason: result.reason };
  const quote = result.quote;
  if (
    quote.reserveTotal !== input.expectedReserve ||
    quote.pricing.total !== input.expectedTotal
  )
    return { ok: false, reason: "PRICE_CHANGED", quote };

  await supersedePendingOrders(input.customerId);

  const settings = await getStoreSettings();
  const holdUntil = new Date(
    Date.now() + settings.paymentHoldMinutes * 60 * 1000,
  );
  const pricing = quote.pricing;
  const line = pricing.lines[0]!;
  const product = quote.product;
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
  const insiderDiscount = pricing.discounts
    .filter((d) => d.kind === "INSIDER")
    .reduce((sum, d) => sum + d.amount, 0);
  const couponDiscounts = pricing.discounts.filter((d) => d.couponId);
  const lineTax = gstPortion(line.total, product.gstRate ?? 0);

  const gifts = await prisma.productVariant.findMany({
    where: { id: { in: quote.gifts.map((g) => g.variantId) } },
    include: { product: { select: { name: true, gstRate: true } } },
  });

  let order: { id: string; orderNumber: string } | null = null;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    try {
      order = await prisma.$transaction(
        async (tx) => {
          for (const discount of couponDiscounts) {
            const locked = await tx.$queryRaw<
              { usageLimit: number | null; perCustomerLimit: number | null }[]
            >`SELECT "usageLimit", "perCustomerLimit" FROM "Coupon" WHERE "id" = ${discount.couponId} FOR UPDATE`;
            const coupon = locked[0];
            if (!coupon) throw new CouponUsedUp();
            if (coupon.usageLimit !== null) {
              const used = await tx.couponRedemption.count({
                where: {
                  couponId: discount.couponId!,
                  status: { in: ["RESERVED", "CONFIRMED"] },
                },
              });
              if (used >= coupon.usageLimit) throw new CouponUsedUp();
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
              if (mine >= coupon.perCustomerLimit) throw new CouponUsedUp();
            }
          }

          const orderNumber = await nextOrderNumber(tx);
          const created = await tx.order.create({
            data: {
              orderNumber,
              customerId: identity.id,
              kind: "PREORDER",
              status: "PENDING",
              paymentMethod: "RAZORPAY",
              preorderCampaignId: quote.campaign.id,
              preorderTierLabel: quote.tier.label,
              reserveTotal: toRupees(quote.reserveTotal),
              balanceDue: toRupees(quote.balanceDue),
              subtotal: toRupees(pricing.subtotal),
              discountTotal: toRupees(pricing.discountTotal),
              insiderDiscount: toRupees(insiderDiscount),
              shippingTotal: toRupees(pricing.shippingFee),
              codFee: toRupees(0),
              taxTotal: toRupees(lineTax),
              total: toRupees(pricing.total),
              shippingAddressId: address.id,
              billingAddressId: address.id,
              shippingAddressSnapshot:
                snapshot as unknown as Prisma.InputJsonValue,
              contactEmail: identity.email,
              contactPhone: identity.phone ?? (address.phone || null),
              couponCode: couponDiscounts.map((d) => d.code).join(", ") || null,
              reservationExpiresAt: holdUntil,
              items: {
                create: [
                  {
                    productVariantId: product.variantId,
                    quantity: quote.quantity,
                    unitPrice: toRupees(product.unitPrice),
                    discountAmount: toRupees(line.discount),
                    taxAmount: toRupees(lineTax),
                    totalAmount: toRupees(line.total),
                    productName: product.name,
                    variantLabel: product.variantLabel,
                    sku: product.sku,
                    imageUrl: product.imageUrl,
                    gstRate:
                      product.gstRate === null
                        ? null
                        : new Prisma.Decimal(product.gstRate),
                    isReturnable: product.isReturnable,
                  },
                  ...quote.gifts.flatMap((gift) => {
                    const variant = gifts.find((g) => g.id === gift.variantId);
                    if (!variant) return [];
                    return [
                      {
                        productVariantId: variant.id,
                        quantity: gift.quantity,
                        unitPrice: toRupees(0),
                        totalAmount: toRupees(0),
                        productName: variant.product.name,
                        variantLabel: gift.itemLabel,
                        sku: variant.sku,
                        isReturnable: false,
                        isFree: true,
                        freeReason: gift.reason,
                      },
                    ];
                  }),
                ],
              },
              discounts: {
                create: pricing.discounts
                  .filter((d) => d.amount > 0 || d.freeShipping)
                  .map((d) => ({
                    kind: d.kind,
                    couponId: d.couponId,
                    code: d.code,
                    label: d.label,
                    amount: toRupees(d.amount),
                    freeShipping: d.freeShipping,
                  })),
              },
              statusHistory: {
                create: {
                  status: "PENDING",
                  note: "Pre-order, waiting for the reserve payment",
                  changedBy: "customer",
                },
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
                status: "RESERVED",
              },
            });
          }
          return created;
        },
        { timeout: 20_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (error instanceof CouponUsedUp)
        return { ok: false, reason: "COUPON_USED_UP", quote };
      if (isUniqueViolation(error, "orderNumber")) continue;
      throw error;
    }
  }
  if (!order) throw new Error("Could not create the pre-order");

  try {
    const rzp = await createRazorpayOrder(input.razorpay, {
      amountPaise: quote.reserveTotal,
      receipt: order.orderNumber,
      notes: { orderId: order.id, stage: "reserve" },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzp.id },
    });
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      reserveTotal: quote.reserveTotal,
      razorpay: {
        keyId: input.razorpay.keyId,
        orderId: rzp.id,
        amount: quote.reserveTotal,
        currency: "INR",
      },
    };
  } catch (error) {
    console.error("[preorders] razorpay order failed", error);
    await cancelUnpaidOrder(order.id, "Payment could not be started");
    return { ok: false, reason: "PAYMENT_UNAVAILABLE", quote };
  }
}
