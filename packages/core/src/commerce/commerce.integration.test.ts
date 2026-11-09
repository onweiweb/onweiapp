import { createHmac } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { addToCart, applyCartCode, getCartView, mergeGuestCart } from "./cart";
import { saveCoupon, type CouponDraft } from "./couponBuilder";
import { markOrderPaid, placeOrder, releaseExpiredOrders } from "./orders";
import { getCustomerOrder } from "./account";
import {
  markReturnReceived,
  approveReturnRequest,
  refundReturn,
  requestReturn,
} from "./returns";
import { verifyRazorpayPaymentSignature } from "../payments/razorpay";

// Everything here is test data (example.test emails, "test-" slugs) and is
// removed afterwards. Online payments are faked by stubbing fetch, so no
// request reaches Razorpay.

const TAG = `t${Date.now()}`;
const razorpay = { keyId: "rzp_test_fake", keySecret: "fake_secret" };

function draft(overrides: Partial<CouponDraft>): CouponDraft {
  return {
    code: `${TAG}-C`.toUpperCase(),
    description: null,
    isActive: true,
    give: { type: "PERCENTAGE", percent: 10 },
    maxDiscount: null,
    scope: "CART",
    categoryIds: [],
    productIds: [],
    excludeSaleItems: false,
    audience: "EVERYONE",
    allowedContacts: [],
    minOrderValue: null,
    minItems: null,
    usageLimit: null,
    perCustomerLimit: null,
    startsAt: null,
    endsAt: null,
    autoApply: false,
    combinableWithCoupons: false,
    combinableWithInsider: false,
    prepaidOnly: false,
    priority: 0,
    ...overrides,
  };
}

describe.skipIf(!process.env.DATABASE_URL)(
  "commerce (integration)",
  { timeout: 60000 },
  () => {
    let staffUserId: string;
    let categoryId: string;
    let productId: string;
    let variantId: string;
    let warehouseId: string;
    const customerIds: string[] = [];
    const couponIds: string[] = [];

    async function makeCustomer(): Promise<{ id: string; addressId: string }> {
      const n = customerIds.length;
      const customer = await prisma.customer.create({
        data: {
          email: `${TAG}-${n}@example.test`,
          emailVerifiedAt: new Date(),
          name: "Test Buyer",
        },
      });
      customerIds.push(customer.id);
      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: "SHIPPING",
          fullName: "Test Buyer",
          phone: "+919876543210",
          line1: "14 Test Road",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400050",
          country: "IN",
          isDefault: true,
        },
      });
      return { id: customer.id, addressId: address.id };
    }

    async function stock(): Promise<{ onHand: number; reserved: number }> {
      const row = await prisma.inventory.findUniqueOrThrow({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
      });
      return { onHand: row.quantityOnHand, reserved: row.quantityReserved };
    }

    async function setStock(onHand: number) {
      await prisma.inventory.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
        data: { quantityOnHand: onHand, quantityReserved: 0 },
      });
    }

    let stubCounter = 0;
    function stubRazorpay() {
      return vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (url, init) => {
          const target = String(url);
          if (target.endsWith("/orders")) {
            const body = JSON.parse(String((init as RequestInit).body)) as {
              amount: number;
              receipt: string;
            };
            const n = ++stubCounter;
            return new Response(
              JSON.stringify({
                id: `order_${TAG}_${n}`,
                amount: body.amount,
                currency: "INR",
                receipt: body.receipt,
                status: "created",
              }),
              { status: 200 },
            );
          }
          if (target.includes("/refund")) {
            const body = JSON.parse(String((init as RequestInit).body)) as {
              amount: number;
            };
            const n = ++stubCounter;
            return new Response(
              JSON.stringify({
                id: `rfnd_${TAG}_${n}`,
                payment_id: "x",
                amount: body.amount,
                status: "processed",
              }),
              { status: 200 },
            );
          }
          throw new Error(`unexpected fetch ${target}`);
        });
    }

    beforeAll(async () => {
      staffUserId = (await prisma.staffUser.findFirstOrThrow()).id;
      const category = await prisma.category.create({
        data: { name: "Test cat", slug: `test-${TAG}` },
      });
      categoryId = category.id;
      const product = await prisma.product.create({
        data: {
          name: "Test Paddle",
          slug: `test-${TAG}`,
          categoryId,
          status: "ACTIVE",
          gstRate: 18,
        },
      });
      productId = product.id;
      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku: `TEST-${TAG}`,
          attributes: { color: "Lime", size: "Small" },
          price: 1000,
        },
      });
      variantId = variant.id;
      const warehouse = await prisma.warehouse.create({
        data: { name: `Test ${TAG}` },
      });
      warehouseId = warehouse.id;
      await prisma.inventory.create({
        data: { productVariantId: variantId, warehouseId, quantityOnHand: 10 },
      });
      await prisma.storeSetting.upsert({
        where: { id: "singleton" },
        create: { id: "singleton" },
        update: {},
      });
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      const orders = await prisma.order.findMany({
        where: { customerId: { in: customerIds } },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.returnRequest.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.couponRedemption.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderDiscount.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.cartItem.deleteMany({
        where: { productVariantId: variantId },
      });
      await prisma.cart.deleteMany({
        where: {
          OR: [
            { customerId: { in: customerIds } },
            { guestToken: { startsWith: TAG } },
          ],
        },
      });
      await prisma.address.deleteMany({
        where: { customerId: { in: customerIds } },
      });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      await prisma.discountRule.deleteMany({
        where: { couponId: { in: couponIds } },
      });
      await prisma.coupon.deleteMany({ where: { id: { in: couponIds } } });
      await prisma.inventoryLog.deleteMany({
        where: { productVariantId: variantId },
      });
      await prisma.inventory.deleteMany({
        where: { productVariantId: variantId },
      });
      await prisma.productVariant.deleteMany({ where: { id: variantId } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.category.deleteMany({ where: { id: categoryId } });
      await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
    });

    it("merges a guest cart into the customer's cart at sign-in", async () => {
      await setStock(10);
      const buyer = await makeCustomer();
      await addToCart({ guestToken: `${TAG}-guest` }, variantId, 2);
      await addToCart({ customerId: buyer.id }, variantId, 1);
      await mergeGuestCart(`${TAG}-guest`, buyer.id);
      const view = await getCartView({ customerId: buyer.id });
      expect(view.lines[0]?.quantity).toBe(3);
      expect(
        await prisma.cart.count({ where: { guestToken: `${TAG}-guest` } }),
      ).toBe(0);
    });

    it("places a COD order: confirmed, stock sold, coupon use confirmed, cart emptied", async () => {
      await setStock(10);
      const coupon = await saveCoupon(
        draft({ code: `${TAG}-COD`, usageLimit: 1 }),
        { staffUserId },
      );
      if (!coupon.ok) throw new Error(JSON.stringify(coupon.errors));
      couponIds.push(coupon.id);

      const buyer = await makeCustomer();
      await addToCart({ customerId: buyer.id }, variantId, 1);
      const applied = await applyCartCode(
        { customerId: buyer.id },
        `${TAG}-cod`,
      );
      expect(applied.ok).toBe(true);
      const view = await getCartView(
        { customerId: buyer.id },
        { paymentMethod: "COD" },
      );
      // 1000 - 10% = 900, below 999 so delivery 99, COD 49.
      expect(view.pricing.total).toBe(90000 + 9900 + 4900);

      const result = await placeOrder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        paymentMethod: "COD",
        expectedTotal: view.pricing.total,
        razorpay: null,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: result.orderId },
        include: { items: true, discounts: true },
      });
      expect(order.status).toBe("CONFIRMED");
      expect(order.items[0]?.productName).toBe("Test Paddle");
      expect(order.discounts[0]?.code).toBe(`${TAG}-COD`.toUpperCase());
      expect(await stock()).toEqual({ onHand: 9, reserved: 0 });
      expect(
        await prisma.couponRedemption.count({
          where: { couponId: coupon.id, status: "CONFIRMED" },
        }),
      ).toBe(1);
      expect((await getCartView({ customerId: buyer.id })).lines).toHaveLength(
        0,
      );

      // The single use is gone for the next customer.
      const next = await makeCustomer();
      await addToCart({ customerId: next.id }, variantId, 1);
      const second = await applyCartCode({ customerId: next.id }, `${TAG}-cod`);
      expect(second).toMatchObject({ ok: false, problem: "NOT_VALID" });
    });

    it("refuses to place an order when the total changed since the review", async () => {
      await setStock(10);
      const buyer = await makeCustomer();
      await addToCart({ customerId: buyer.id }, variantId, 1);
      const result = await placeOrder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        paymentMethod: "COD",
        expectedTotal: 1,
        razorpay: null,
      });
      expect(result).toMatchObject({ ok: false, reason: "PRICE_CHANGED" });
      expect(
        await prisma.order.count({ where: { customerId: buyer.id } }),
      ).toBe(0);
    });

    it("online order: holds stock, confirms once, ignores a repeat confirmation", async () => {
      await setStock(5);
      const fetchStub = stubRazorpay();
      const buyer = await makeCustomer();
      await addToCart({ customerId: buyer.id }, variantId, 2);
      const view = await getCartView(
        { customerId: buyer.id },
        { paymentMethod: "RAZORPAY" },
      );
      const result = await placeOrder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        paymentMethod: "RAZORPAY",
        expectedTotal: view.pricing.total,
        razorpay,
      });
      expect(result.ok).toBe(true);
      if (!result.ok || !result.razorpay) return;
      expect(await stock()).toEqual({ onHand: 5, reserved: 2 });

      const signature = createHmac("sha256", razorpay.keySecret)
        .update(`${result.razorpay.orderId}|pay_${TAG}_1`)
        .digest("hex");
      expect(
        verifyRazorpayPaymentSignature(
          {
            orderId: result.razorpay.orderId,
            paymentId: `pay_${TAG}_1`,
            signature,
          },
          razorpay.keySecret,
        ),
      ).toBe(true);

      const first = await markOrderPaid({
        razorpayOrderId: result.razorpay.orderId,
        paymentId: `pay_${TAG}_1`,
        amountPaise: result.total,
        method: "upi",
        razorpay,
      });
      const again = await markOrderPaid({
        razorpayOrderId: result.razorpay.orderId,
        paymentId: `pay_${TAG}_1`,
        amountPaise: result.total,
        method: "upi",
        razorpay,
      });
      expect(first).toMatchObject({ ok: true, status: "CONFIRMED" });
      expect(again).toMatchObject({ ok: true, status: "ALREADY_CONFIRMED" });
      expect(await stock()).toEqual({ onHand: 3, reserved: 0 });
      expect(
        await prisma.payment.count({ where: { orderId: result.orderId } }),
      ).toBe(1);
      fetchStub.mockRestore();
    });

    it("releases an unpaid order after the hold, and refunds a payment that arrives late", async () => {
      await setStock(5);
      const fetchStub = stubRazorpay();
      const buyer = await makeCustomer();
      await addToCart({ customerId: buyer.id }, variantId, 1);
      const view = await getCartView(
        { customerId: buyer.id },
        { paymentMethod: "RAZORPAY" },
      );
      const result = await placeOrder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        paymentMethod: "RAZORPAY",
        expectedTotal: view.pricing.total,
        razorpay,
      });
      if (!result.ok || !result.razorpay) throw new Error("order failed");
      expect(await stock()).toEqual({ onHand: 5, reserved: 1 });

      await prisma.order.update({
        where: { id: result.orderId },
        data: { reservationExpiresAt: new Date(Date.now() - 1000) },
      });
      expect(await releaseExpiredOrders()).toBeGreaterThanOrEqual(1);
      expect(await stock()).toEqual({ onHand: 5, reserved: 0 });
      expect(
        (
          await prisma.order.findUniqueOrThrow({
            where: { id: result.orderId },
          })
        ).status,
      ).toBe("CANCELLED");

      const late = await markOrderPaid({
        razorpayOrderId: result.razorpay.orderId,
        paymentId: `pay_${TAG}_late`,
        amountPaise: result.total,
        razorpay,
      });
      expect(late).toMatchObject({ ok: true, status: "REFUNDING" });
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: result.orderId },
        include: { refunds: true },
      });
      expect(order.needsAttention).toContain("refunded automatically");
      expect(order.refunds).toHaveLength(1);
      expect(await stock()).toEqual({ onHand: 5, reserved: 0 });
      fetchStub.mockRestore();
    });

    it("lets only one of two buyers take the last item", async () => {
      await setStock(1);
      const a = await makeCustomer();
      const b = await makeCustomer();
      await prisma.inventory.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
        data: { quantityOnHand: 2 },
      });
      await addToCart({ customerId: a.id }, variantId, 1);
      await addToCart({ customerId: b.id }, variantId, 1);
      await setStock(1);
      const [va, vb] = await Promise.all([
        getCartView({ customerId: a.id }, { paymentMethod: "COD" }),
        getCartView({ customerId: b.id }, { paymentMethod: "COD" }),
      ]);
      const results = await Promise.all([
        placeOrder({
          customerId: a.id,
          addressId: a.addressId,
          paymentMethod: "COD",
          expectedTotal: va.pricing.total,
          razorpay: null,
        }),
        placeOrder({
          customerId: b.id,
          addressId: b.addressId,
          paymentMethod: "COD",
          expectedTotal: vb.pricing.total,
          razorpay: null,
        }),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok)[0]).toMatchObject({
        reason: "OUT_OF_STOCK",
      });
      expect(await stock()).toEqual({ onHand: 0, reserved: 0 });
    });

    it("returns: refund is what was paid, stock goes back once on receipt", async () => {
      await setStock(10);
      const buyer = await makeCustomer();
      await addToCart({ customerId: buyer.id }, variantId, 2);
      const view = await getCartView(
        { customerId: buyer.id },
        { paymentMethod: "COD" },
      );
      const placed = await placeOrder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        paymentMethod: "COD",
        expectedTotal: view.pricing.total,
        razorpay: null,
      });
      if (!placed.ok) throw new Error("order failed");
      await prisma.order.update({
        where: { id: placed.orderId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      const detail = await getCustomerOrder(buyer.id, placed.orderNumber);
      const item = detail!.items[0]!;
      expect(item.returnableQuantity).toBe(2);

      const settings = await prisma.storeSetting.findUniqueOrThrow({
        where: { id: "singleton" },
      });
      const noUpi = await requestReturn({
        customerId: buyer.id,
        orderNumber: placed.orderNumber,
        items: [{ orderItemId: item.id, quantity: 1 }],
        reason: settings.returnReasons[0]!,
        resolution: "REFUND",
      });
      expect(noUpi).toMatchObject({ ok: false, reason: "UPI_REQUIRED" });

      const asked = await requestReturn({
        customerId: buyer.id,
        orderNumber: placed.orderNumber,
        items: [{ orderItemId: item.id, quantity: 1 }],
        reason: settings.returnReasons[0]!,
        resolution: "REFUND",
        payoutUpi: "test@okaxis",
      });
      expect(asked).toEqual({ ok: true, count: 1 });
      const request = await prisma.returnRequest.findFirstOrThrow({
        where: { orderId: placed.orderId },
      });
      // Paid 2000 for two, so one unit refunds 1000.
      expect(Number(request.refundAmount)).toBe(1000);

      await approveReturnRequest(request.id, { staffUserId });
      expect(await stock()).toEqual({ onHand: 8, reserved: 0 });
      await Promise.allSettled([
        markReturnReceived(request.id, true, { staffUserId }),
        markReturnReceived(request.id, true, { staffUserId }),
      ]);
      expect(await stock()).toEqual({ onHand: 9, reserved: 0 });
      const refunded = await refundReturn(request.id, { staffUserId }, null);
      expect(refunded).toEqual({ ok: true });
      const refunds = await prisma.refund.findMany({
        where: { orderId: placed.orderId },
      });
      expect(refunds.map((r) => Number(r.amount))).toEqual([1000]);
    });
  },
);
