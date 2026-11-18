import { prisma } from "@onwei/database";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { markOrderPaid } from "../commerce/orders";
import {
  addToCart,
  getCartView,
  quickAddProduct,
  setCartQuantity,
} from "../commerce/cart";
import { updateSiteSetting } from "../settings/siteSetting";
import {
  canStartPreorderMode,
  getStorefront,
  storefrontProductWhere,
} from "./storefront";
import { resolveCoupons } from "../commerce/couponEligibility";
import { getCustomerIdentity } from "../commerce/customerIdentity";
import {
  cancelPreorder,
  getPreorderOverview,
  placePreorder,
  quotePreorder,
  requestPreorderBalance,
  runPreorderReminders,
  savePreorderCampaign,
} from "./index";

// Runs the whole pre-order path against the dev database: reserve, pay the
// reserve, stock arrives, pay the balance, and cancel to a credit. Razorpay
// is faked by stubbing fetch. Everything made here is removed afterwards.

const TAG = `pre-${crypto.randomUUID().slice(0, 8)}`;
const razorpay = { keyId: "rzp_test_fake", keySecret: "fake_secret" };
const DAY = 24 * 60 * 60 * 1000;

function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe.skipIf(!process.env.DATABASE_URL)(
  "pre-orders (integration)",
  { timeout: 60000 },
  () => {
    let staffUserId: string;
    let categoryId: string;
    let productId: string;
    let variantId: string;
    let boxProductId: string;
    let boxVariantId: string;
    let warehouseId: string;
    let campaignId: string;
    let previousActive: string[] = [];
    let previousMode: "ADD" | "BEST" | null = null;
    let previousSiteMode: "WAITLIST" | "PREORDERS" | "LIVE" | null = null;
    const customerIds: string[] = [];
    let counter = 0;

    // Mocks are reset between tests (vitest config), so stub before each.
    beforeEach(() => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const target = String(url);
        if (target.endsWith("/orders")) {
          const body = JSON.parse(String((init as RequestInit).body)) as {
            amount: number;
            receipt: string;
          };
          return new Response(
            JSON.stringify({
              id: `order_${TAG}_${++counter}`,
              amount: body.amount,
              currency: "INR",
              receipt: body.receipt,
              status: "created",
            }),
            { status: 200 },
          );
        }
        throw new Error(`unexpected fetch ${target}`);
      });
    });

    beforeAll(async () => {
      staffUserId = (await prisma.staffUser.findFirstOrThrow()).id;
      previousActive = (
        await prisma.preorderCampaign.findMany({
          where: { isActive: true },
          select: { id: true },
        })
      ).map((c) => c.id);
      const setting = await prisma.insiderSetting.findUnique({
        where: { id: "singleton" },
      });
      previousMode = setting?.stackMode ?? null;
      await prisma.insiderSetting.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", stackMode: "ADD" },
        update: { stackMode: "ADD" },
      });
      await prisma.storeSetting.upsert({
        where: { id: "singleton" },
        create: { id: "singleton" },
        update: {},
      });

      const category = await prisma.category.create({
        data: { name: "Pre cat", slug: TAG },
      });
      categoryId = category.id;
      const product = await prisma.product.create({
        data: {
          name: "Pre Paddle",
          slug: TAG,
          categoryId,
          status: "ACTIVE",
          gstRate: 18,
        },
      });
      productId = product.id;
      variantId = (
        await prisma.productVariant.create({
          data: {
            productId,
            sku: `PRE-${TAG}`,
            attributes: { color: "Lime" },
            price: 4000,
          },
        })
      ).id;
      const box = await prisma.product.create({
        data: {
          name: "Mystery box",
          slug: `${TAG}-box`,
          categoryId,
          status: "ACTIVE",
          giftOnly: true,
        },
      });
      boxProductId = box.id;
      boxVariantId = (
        await prisma.productVariant.create({
          data: {
            productId: box.id,
            sku: `BOX-${TAG}`,
            attributes: {},
            price: 1000,
          },
        })
      ).id;
      warehouseId = (
        await prisma.warehouse.create({ data: { name: `Pre ${TAG}` } })
      ).id;
      await prisma.inventory.createMany({
        data: [
          { productVariantId: variantId, warehouseId, quantityOnHand: 0 },
          { productVariantId: boxVariantId, warehouseId, quantityOnHand: 0 },
        ],
      });

      const saved = await savePreorderCampaign(
        {
          name: `Test ${TAG}`,
          isActive: true,
          startDate: istToday(),
          reserveAmount: 900,
          expectedShipDate: null,
          productIds: [productId],
          insiderGiftVariantId: null,
          tiers: [
            {
              label: "Tier 1",
              days: 7,
              percent: 15,
              giftVariantId: boxVariantId,
              giftLabel: "Tier 1 mystery box",
            },
            {
              label: "Tier 2",
              days: 7,
              percent: 10,
              giftVariantId: null,
              giftLabel: null,
            },
          ],
        },
        { staffUserId },
      );
      if (!saved.ok) throw new Error(JSON.stringify(saved.errors));
      campaignId = saved.id;

      // Reserving needs the site in pre-order mode.
      previousSiteMode =
        (
          await prisma.siteSetting.findUnique({
            where: { id: "singleton" },
            select: { siteMode: true },
          })
        )?.siteMode ?? null;
      await prisma.siteSetting.update({
        where: { id: "singleton" },
        data: { siteMode: "PREORDERS" },
      });
    }, 60000);

    afterAll(async () => {
      vi.restoreAllMocks();
      const orders = await prisma.order.findMany({
        where: { customerId: { in: customerIds } },
        select: { id: true, creditCouponId: true },
      });
      const orderIds = orders.map((o) => o.id);
      const creditIds = orders
        .map((o) => o.creditCouponId)
        .filter((id): id is string => Boolean(id));
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
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
      await prisma.discountRule.deleteMany({
        where: { couponId: { in: creditIds } },
      });
      await prisma.coupon.deleteMany({ where: { id: { in: creditIds } } });
      await prisma.address.deleteMany({
        where: { customerId: { in: customerIds } },
      });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      await prisma.preorderCampaign.deleteMany({ where: { id: campaignId } });
      if (previousSiteMode)
        await prisma.siteSetting.update({
          where: { id: "singleton" },
          data: { siteMode: previousSiteMode },
        });
      if (previousActive.length)
        await prisma.preorderCampaign.updateMany({
          where: { id: { in: previousActive } },
          data: { isActive: true },
        });
      if (previousMode)
        await prisma.insiderSetting.update({
          where: { id: "singleton" },
          data: { stackMode: previousMode },
        });
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: [campaignId, productId, ...orderIds] } },
      });
      const variants = [variantId, boxVariantId];
      await prisma.inventoryLog.deleteMany({
        where: { productVariantId: { in: variants } },
      });
      await prisma.inventory.deleteMany({
        where: { productVariantId: { in: variants } },
      });
      await prisma.productVariant.deleteMany({
        where: { id: { in: variants } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: [productId, boxProductId] } },
      });
      await prisma.category.deleteMany({ where: { id: categoryId } });
      await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
    }, 60000);

    async function makeCustomer() {
      const customer = await prisma.customer.create({
        data: {
          email: `${TAG}-${customerIds.length}@example.test`,
          emailVerifiedAt: new Date(),
          name: "Pre Buyer",
        },
      });
      customerIds.push(customer.id);
      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: "SHIPPING",
          fullName: "Pre Buyer",
          phone: "+919876543210",
          line1: "1 Test Road",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400050",
          country: "IN",
          isDefault: true,
        },
      });
      return { id: customer.id, addressId: address.id };
    }

    async function reserve(quantity: number) {
      const buyer = await makeCustomer();
      const q = await quotePreorder({
        variantId,
        quantity,
        customerId: buyer.id,
      });
      if (!q.ok) throw new Error(q.reason);
      const placed = await placePreorder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        variantId,
        quantity,
        codes: [],
        expectedReserve: q.quote.reserveTotal,
        expectedTotal: q.quote.pricing.total,
        razorpay,
      });
      if (!placed.ok) throw new Error(placed.reason);
      const paid = await markOrderPaid({
        razorpayOrderId: placed.razorpay.orderId,
        paymentId: `pay_${TAG}_${++counter}`,
        amountPaise: placed.reserveTotal,
        razorpay,
      });
      return { buyer, quote: q.quote, placed, paid };
    }

    it("is open for the campaign product only, and closed while the site is live", async () => {
      const storefront = await getStorefront();
      expect(storefront.state).toBe("PREORDER_OPEN");
      expect(storefront.campaignProductIds).toEqual([productId]);
      const listed = await prisma.product.findMany({
        where: await storefrontProductWhere(),
        select: { id: true },
      });
      expect(listed.map((p) => p.id)).toEqual([productId]);

      await prisma.siteSetting.update({
        where: { id: "singleton" },
        data: { siteMode: "LIVE" },
      });
      try {
        const q = await quotePreorder({
          variantId,
          quantity: 1,
          customerId: null,
        });
        expect(q).toEqual({ ok: false, reason: "NOT_OPEN" });
      } finally {
        await prisma.siteSetting.update({
          where: { id: "singleton" },
          data: { siteMode: "PREORDERS" },
        });
      }
    });

    it("keeps the normal bag shut in pre-order mode", async () => {
      const owner = { customerId: null, guestToken: `guest-${TAG}` };
      expect(await addToCart(owner, variantId, 1)).toEqual({
        ok: false,
        reason: "PREORDER_ONLY",
      });
      expect(await quickAddProduct(owner, productId)).toEqual({
        ok: false,
        reason: "PREORDER_ONLY",
      });
      expect(await setCartQuantity(owner, variantId, 2)).toMatchObject({
        ok: true,
        quantity: 0,
      });
      const view = await getCartView(owner);
      expect(view.preorderOnly).toBe(true);
      expect(view.canCheckout).toBe(false);
    });

    it("empties every bag when the site switches to pre-order mode", async () => {
      const guestToken = `bag-${TAG}`;
      await prisma.siteSetting.update({
        where: { id: "singleton" },
        data: { siteMode: "LIVE" },
      });
      const cart = await prisma.cart.create({
        data: {
          guestToken,
          couponCodes: ["SAVE10"],
          items: { create: { productVariantId: variantId, quantity: 1 } },
        },
      });
      try {
        await updateSiteSetting({ siteMode: "PREORDERS" }, { staffUserId });
        expect(
          await prisma.cartItem.count({ where: { cartId: cart.id } }),
        ).toBe(0);
        const after = await prisma.cart.findUniqueOrThrow({
          where: { id: cart.id },
        });
        expect(after.couponCodes).toEqual([]);
        expect(await canStartPreorderMode()).toBe(true);
      } finally {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.delete({ where: { id: cart.id } });
        await prisma.siteSetting.update({
          where: { id: "singleton" },
          data: { siteMode: "PREORDERS" },
        });
      }
    });

    it("prices tier 1 and splits ₹900 per item from the balance", async () => {
      const buyer = await makeCustomer();
      const q = await quotePreorder({
        variantId,
        quantity: 2,
        customerId: buyer.id,
      });
      expect(q.ok).toBe(true);
      if (!q.ok) return;
      expect(q.quote.tier.label).toBe("Tier 1");
      expect(q.quote.pricing.discountTotal).toBe(120000); // 15% of 8000
      expect(q.quote.reserveTotal).toBe(180000);
      expect(q.quote.balanceDue).toBe(q.quote.pricing.total - 180000);
      expect(q.quote.gifts).toMatchObject([
        { variantId: boxVariantId, quantity: 2, reason: "Tier 1 mystery box" },
      ]);
    });

    it("reserves, holds stock first come first served, then takes the balance", async () => {
      const first = await reserve(2);
      expect(first.paid).toMatchObject({ ok: true, status: "RESERVED" });
      const second = await reserve(1);

      // Only enough stock for the first order; no boxes in stock.
      await prisma.inventory.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
        data: { quantityOnHand: 2 },
      });
      const asked = await requestPreorderBalance({
        productId,
        actor: { staffUserId },
        razorpay,
      });
      if ("error" in asked) throw new Error(asked.error);
      expect(asked.asked.map((a) => a.orderNumber)).toEqual([
        first.placed.orderNumber,
      ]);
      expect(asked.waiting).toBe(1);
      expect(asked.missingGifts).toBe(1);

      const order = await prisma.order.findUniqueOrThrow({
        where: { id: first.placed.orderId },
      });
      expect(order.needsAttention).toMatch(/out of stock/);
      const balance = await markOrderPaid({
        razorpayOrderId: order.balanceRazorpayOrderId!,
        paymentId: `pay_${TAG}_${++counter}`,
        amountPaise: first.quote.balanceDue,
        razorpay,
      });
      expect(balance).toMatchObject({ ok: true, status: "CONFIRMED" });
      const inv = await prisma.inventory.findUniqueOrThrow({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
      });
      expect(inv).toMatchObject({ quantityOnHand: 0, quantityReserved: 0 });

      const overview = await getPreorderOverview(campaignId);
      expect(overview.orders).toBe(2);
      expect(overview.items[0]).toMatchObject({ waiting: 1, paid: 2 });
      void second;
    });

    it("turns a cancelled reservation into a year-long credit that keeps its leftover", async () => {
      const { buyer, placed, quote } = await reserve(1);
      const cancelled = await cancelPreorder({
        orderId: placed.orderId,
        mode: "CREDIT",
        reason: "Changed my mind",
        customerId: buyer.id,
      });
      expect(cancelled.ok).toBe(true);
      if (!cancelled.ok) return;
      expect(cancelled.amount).toBe(quote.reserveTotal);
      expect(cancelled.creditCode).toMatch(/^CR-/);
      const days = (cancelled.creditEndsAt!.getTime() - Date.now()) / DAY;
      expect(Math.round(days)).toBe(365);

      const identity = await getCustomerIdentity(buyer.id);
      const resolved = await resolveCoupons({
        codes: [cancelled.creditCode!],
        identity,
        insider: null,
      });
      expect(resolved.coupons[0]).toMatchObject({
        isCredit: true,
        appliesTo: "BOTH",
        give: { type: "FLAT", amount: 90000 },
      });
    });

    it("reminds, then turns an unpaid balance into credit after 14 days", async () => {
      await prisma.inventory.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
        data: { quantityOnHand: 5, quantityReserved: 0 },
      });
      const { placed } = await reserve(1);
      await requestPreorderBalance({
        productId,
        actor: { staffUserId },
        razorpay,
      });
      const askedAt = new Date();
      await prisma.order.update({
        where: { id: placed.orderId },
        data: { balanceRequestedAt: askedAt },
      });
      const day4 = await runPreorderReminders(
        new Date(askedAt.getTime() + 4 * DAY),
      );
      expect(day4.remind.map((r) => r.orderId)).toContain(placed.orderId);
      const day15 = await runPreorderReminders(
        new Date(askedAt.getTime() + 15 * DAY),
      );
      expect(day15.creditMade.map((c) => c.orderId)).toContain(placed.orderId);
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: placed.orderId },
      });
      expect(order.status).toBe("CANCELLED");
      expect(order.creditCouponId).toBeTruthy();
    });
  },
);
