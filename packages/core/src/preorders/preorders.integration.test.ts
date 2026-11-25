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
import { markOrderPaid, placeOrder } from "../commerce/orders";
import {
  addToCart,
  getCartView,
  quickAddProduct,
  setCartQuantity,
} from "../commerce/cart";
import { updateSiteSetting } from "../settings/siteSetting";
import { listGiftableItems } from "./giftItems";
import { previewPreorderJourney } from "./journey";
import {
  canStartPreorderMode,
  getStorefront,
  storefrontProductWhere,
} from "./storefront";
import { resolveCoupons } from "../commerce/couponEligibility";
import { getCustomerIdentity } from "../commerce/customerIdentity";
import {
  cancelPreorder,
  getPreorderCampaign,
  getPreorderOverview,
  nudgePreorderBalance,
  runPreorderReminders,
  savePreorderCampaign,
  suggestPreorderRefund,
} from "./index";

// Runs the whole pre-order path against the dev database: fill the bag, pay
// the reserve (stock held), pay the balance, the nudge and the deadline job,
// and cancel to a credit. Razorpay is faked by stubbing fetch. Everything
// made here is removed afterwards.

const TAG = `pre-${crypto.randomUUID().slice(0, 8)}`;
const razorpay = { keyId: "rzp_test_fake", keySecret: "fake_secret" };
const DAY = 24 * 60 * 60 * 1000;

function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe.skipIf(!process.env.DATABASE_URL)(
  "pre-orders (integration)",
  // The dev database is far away (about 0.4s a query from a laptop).
  { timeout: 240000 },
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
        if (target.includes("/payments/") && !target.endsWith("/refund")) {
          return new Response(
            JSON.stringify({
              id: target.split("/payments/")[1],
              order_id: "x",
              amount: 50000,
              currency: "INR",
              status: "captured",
              method: "upi",
              fee: 1180,
              tax: 180,
            }),
            { status: 200 },
          );
        }
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
          { productVariantId: variantId, warehouseId, quantityOnHand: 20 },
          { productVariantId: boxVariantId, warehouseId, quantityOnHand: 0 },
        ],
      });

      const saved = await savePreorderCampaign(
        {
          name: `Test ${TAG}`,
          isActive: true,
          startDate: istToday(),
          reserveLow: 500,
          reserveHigh: 900,
          reserveThreshold: 4000,
          nudgeDaysBeforeClose: 7,
          balanceDueDaysAfterClose: 7,
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
    }, 240000);

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
      await prisma.cartItem.deleteMany({
        where: { cart: { customerId: { in: customerIds } } },
      });
      await prisma.cart.deleteMany({
        where: { customerId: { in: customerIds } },
      });
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
        where: {
          entityId: {
            in: [campaignId, productId, ...orderIds].filter(
              (id): id is string => Boolean(id),
            ),
          },
        },
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
    }, 240000);

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

    async function setStock(onHand: number, boxes = 0) {
      await prisma.inventory.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId,
          },
        },
        data: { quantityOnHand: onHand, quantityReserved: 0 },
      });
      await prisma.inventory.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: boxVariantId,
            warehouseId,
          },
        },
        data: { quantityOnHand: boxes, quantityReserved: 0 },
      });
    }

    async function stockOf(id: string) {
      return prisma.inventory.findUniqueOrThrow({
        where: {
          productVariantId_warehouseId: { productVariantId: id, warehouseId },
        },
      });
    }

    async function reserve(quantity: number) {
      const buyer = await makeCustomer();
      const owner = { customerId: buyer.id };
      const added = await addToCart(owner, variantId, quantity);
      if (!added.ok) throw new Error(added.reason);
      const view = await getCartView(owner);
      if (!view.preorder) throw new Error("not a pre-order bag");
      const placed = await placeOrder({
        customerId: buyer.id,
        addressId: buyer.addressId,
        paymentMethod: "RAZORPAY",
        expectedTotal: view.pricing.total,
        razorpay,
      });
      if (!placed.ok) throw new Error(placed.reason);
      const paid = await markOrderPaid({
        razorpayOrderId: placed.razorpay!.orderId,
        paymentId: `pay_${TAG}_${++counter}`,
        amountPaise: placed.reserveTotal!,
        razorpay,
      });
      return { buyer, view, preorder: view.preorder, placed, paid };
    }

    it("is open for the campaign product only, and a normal bag while the site is live", async () => {
      const storefront = await getStorefront();
      expect(storefront.state).toBe("PREORDER_OPEN");
      expect(storefront.campaignProductIds).toEqual([productId]);
      const listed = await prisma.product.findMany({
        where: await storefrontProductWhere(),
        select: { id: true },
      });
      expect(listed.map((p) => p.id)).toEqual([productId]);

      const owner = { customerId: null, guestToken: `live-${TAG}` };
      await prisma.siteSetting.update({
        where: { id: "singleton" },
        data: { siteMode: "LIVE" },
      });
      try {
        await addToCart(owner, variantId, 1);
        const view = await getCartView(owner);
        expect(view.preorder).toBeNull();
        expect(view.lines).toHaveLength(1);
      } finally {
        await prisma.cartItem.deleteMany({
          where: { cart: { guestToken: owner.guestToken } },
        });
        await prisma.cart.deleteMany({
          where: { guestToken: owner.guestToken },
        });
        await prisma.siteSetting.update({
          where: { id: "singleton" },
          data: { siteMode: "PREORDERS" },
        });
      }
    });

    it("takes only campaign products in the bag, and shuts it when no lap runs", async () => {
      const owner = { customerId: null, guestToken: `guest-${TAG}` };
      try {
        expect(await addToCart(owner, boxVariantId, 1)).toEqual({
          ok: false,
          reason: "PREORDER_ONLY",
        });
        expect(await addToCart(owner, variantId, 1)).toMatchObject({
          ok: true,
        });
        expect(await quickAddProduct(owner, productId)).toMatchObject({
          ok: true,
        });
        const open = await getCartView(owner);
        expect(open.preorder).not.toBeNull();
        expect(open.canCheckout).toBe(true);

        await prisma.preorderCampaign.update({
          where: { id: campaignId },
          data: { isActive: false },
        });
        try {
          expect(await setCartQuantity(owner, variantId, 3)).toEqual({
            ok: false,
            reason: "PREORDER_ONLY",
          });
          const shut = await getCartView(owner);
          expect(shut.preorderOnly).toBe(true);
          expect(shut.canCheckout).toBe(false);
        } finally {
          await prisma.preorderCampaign.update({
            where: { id: campaignId },
            data: { isActive: true },
          });
        }
      } finally {
        await prisma.cartItem.deleteMany({
          where: { cart: { guestToken: owner.guestToken } },
        });
        await prisma.cart.deleteMany({
          where: { guestToken: owner.guestToken },
        });
      }
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

    it("reserves ₹500 up to ₹4,000 of products and ₹900 above, before discounts", async () => {
      const buyer = await makeCustomer();
      const owner = { customerId: buyer.id };
      await addToCart(owner, variantId, 1);
      const one = await getCartView(owner);
      expect(one.preorder).toMatchObject({
        tierLabel: "Tier 1",
        productTotal: 400000,
        reserveTotal: 50000,
      });
      expect(one.pricing.discountTotal).toBe(60000); // 15% of ₹4,000
      expect(one.preorder!.balanceDue).toBe(one.pricing.total - 50000);

      await setCartQuantity(owner, variantId, 2);
      const two = await getCartView(owner);
      expect(two.preorder).toMatchObject({
        productTotal: 800000,
        reserveTotal: 90000,
      });
      expect(two.preorder!.gifts).toMatchObject([
        { variantId: boxVariantId, quantity: 2, reason: "Tier 1 mystery box" },
      ]);
    });

    it("previews each tier's price for everyone and for Insiders", async () => {
      const preview = await previewPreorderJourney({
        variantId,
        tiers: [
          { label: "Tier 1", percent: 15 },
          { label: "Tier 2", percent: 10 },
        ],
        reserve: {
          reserveLow: 50000,
          reserveHigh: 90000,
          reserveThreshold: 400000,
        },
      });
      expect(preview?.price).toBe(400000);
      const [one, two] = preview!.tiers;
      expect(one!.everyone.total).toBeLessThan(two!.everyone.total);
      expect(one!.insider.total).toBeLessThanOrEqual(one!.everyone.total);
      expect(one!.everyone.reserveTotal).toBe(50000);
      expect(one!.everyone.balanceDue).toBe(one!.everyone.total - 50000);
    });

    it("gives every gift option its value", async () => {
      const box = (await listGiftableItems()).find(
        (g) => g.id === boxVariantId,
      );
      expect(box?.value).toBe(100000);
    });

    it("holds stock at reserve, empties the bag, and takes the balance any time", async () => {
      await setStock(3, 0);
      const first = await reserve(2);
      expect(first.paid).toMatchObject({ ok: true, status: "RESERVED" });
      expect(await stockOf(variantId)).toMatchObject({
        quantityOnHand: 3,
        quantityReserved: 2,
      });
      expect(
        await prisma.cartItem.count({
          where: { cart: { customerId: first.buyer.id } },
        }),
      ).toBe(0);
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: first.placed.orderId },
      });
      // No boxes in stock: the order goes ahead, flagged for staff.
      expect(order.needsAttention).toMatch(/out of stock/);

      // Only 1 left: a second customer can't take 2.
      const buyer = await makeCustomer();
      expect(
        await addToCart({ customerId: buyer.id }, variantId, 2),
      ).toMatchObject({
        ok: true,
        quantity: 1,
        limited: true,
      });

      const { getBalancePayment } = await import("./balance");
      const pay = await getBalancePayment(
        first.buyer.id,
        first.placed.orderNumber,
        razorpay,
      );
      const balance = await markOrderPaid({
        razorpayOrderId: pay!.orderId,
        paymentId: `pay_${TAG}_${++counter}`,
        amountPaise: first.preorder.balanceDue,
        razorpay,
      });
      expect(balance).toMatchObject({ ok: true, status: "CONFIRMED" });
      expect(await stockOf(variantId)).toMatchObject({
        quantityOnHand: 1,
        quantityReserved: 0,
      });

      const overview = await getPreorderOverview(campaignId);
      expect(overview.orders).toBeGreaterThanOrEqual(1);
    });

    it("turns a cancelled reservation into a year-long credit and frees the stock", async () => {
      await setStock(5, 5);
      const { buyer, placed, preorder } = await reserve(1);
      expect(await stockOf(variantId)).toMatchObject({ quantityReserved: 1 });
      const cancelled = await cancelPreorder({
        orderId: placed.orderId,
        mode: "CREDIT",
        reason: "Changed my mind",
        customerId: buyer.id,
      });
      expect(cancelled.ok).toBe(true);
      if (!cancelled.ok) return;
      expect(cancelled.amount).toBe(preorder.reserveTotal);
      expect(cancelled.creditCode).toMatch(/^CR-/);
      const days = (cancelled.creditEndsAt!.getTime() - Date.now()) / DAY;
      expect(Math.round(days)).toBe(365);
      expect(await stockOf(variantId)).toMatchObject({ quantityReserved: 0 });
      expect(await stockOf(boxVariantId)).toMatchObject({
        quantityReserved: 0,
      });

      const identity = await getCustomerIdentity(buyer.id);
      const resolved = await resolveCoupons({
        codes: [cancelled.creditCode!],
        identity,
        insider: null,
      });
      expect(resolved.coupons[0]).toMatchObject({
        isCredit: true,
        appliesTo: "BOTH",
        give: { type: "FLAT", amount: 50000 },
      });
    });

    it("locks cancelling once the nudge goes out", async () => {
      await setStock(5, 5);
      const { buyer, placed } = await reserve(1);
      const nudged = await nudgePreorderBalance({
        orderIds: [placed.orderId],
        actor: { staffUserId },
      });
      expect(nudged.nudged.map((n) => n.orderId)).toEqual([placed.orderId]);
      const again = await nudgePreorderBalance({
        orderIds: [placed.orderId],
        actor: { staffUserId },
      });
      expect(again).toMatchObject({ nudged: [], skipped: 1 });
      expect(
        await cancelPreorder({
          orderId: placed.orderId,
          mode: "CREDIT",
          reason: "Changed my mind",
          customerId: buyer.id,
        }),
      ).toEqual({ ok: false, reason: "NOT_CANCELLABLE" });
    });

    it("nudges a week before close, sends a last call, then makes credit after the due date", async () => {
      await setStock(5, 5);
      const { placed } = await reserve(1);
      const campaign = (await getPreorderCampaign(campaignId))!;
      const { nudgeAt, balanceDueAt } = campaign.deadlines;

      const early = await runPreorderReminders(
        new Date(nudgeAt.getTime() - DAY),
      );
      expect(early.remind.map((r) => r.orderId)).not.toContain(placed.orderId);

      const nudge = await runPreorderReminders(
        new Date(nudgeAt.getTime() + 1),
        campaignId,
      );
      expect(nudge.remind).toContainEqual({
        orderId: placed.orderId,
        orderNumber: placed.orderNumber,
        reminder: 0,
      });

      const last = await runPreorderReminders(
        new Date(balanceDueAt.getTime() - DAY),
        campaignId,
      );
      expect(last.remind).toContainEqual({
        orderId: placed.orderId,
        orderNumber: placed.orderNumber,
        reminder: 1,
      });

      const due = await runPreorderReminders(balanceDueAt, campaignId);
      expect(due.creditMade.map((c) => c.orderId)).toContain(placed.orderId);
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: placed.orderId },
      });
      expect(order.status).toBe("CANCELLED");
      expect(order.creditCouponId).toBeTruthy();
    });

    it("suggests a cash refund without the gateway fee", async () => {
      await setStock(5, 5);
      const { placed } = await reserve(1);
      const suggestion = await suggestPreorderRefund(placed.orderId, razorpay);
      expect(suggestion).toEqual({
        reserve: 50000,
        gatewayFee: 1180,
        suggested: 48820,
        keepsFee: true,
      });
    });
  },
);
