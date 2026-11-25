// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

const tag = crypto.randomUUID().slice(0, 8);

describe.skipIf(!process.env.DATABASE_URL)(
  "Pre-order and discount admin routes",
  { timeout: 30000 },
  () => {
    const staffIds: string[] = [];
    const campaignIds: string[] = [];
    let plainCookie: string;
    let adminCookie: string;
    let categoryId: string;
    let productId: string;
    let variantId: string;

    async function makeStaff(email: string): Promise<string> {
      const staff = await prisma.staffUser.create({
        data: { email, passwordHash: "not-a-real-hash", name: "Test Staff" },
      });
      staffIds.push(staff.id);
      const token = await createStaffSessionToken(
        { staffUserId: staff.id },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      return `${STAFF_SESSION_COOKIE_NAME}=${token}`;
    }

    beforeAll(async () => {
      plainCookie = await makeStaff(`test-pre-staff-${tag}@example.com`);
      const adminEmail = `test-pre-admin-${tag}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
      categoryId = (
        await prisma.category.create({
          data: { name: "Pre route", slug: `pre-route-${tag}` },
        })
      ).id;
      productId = (
        await prisma.product.create({
          data: {
            name: "Route Paddle",
            slug: `pre-route-${tag}`,
            categoryId,
            status: "ACTIVE",
          },
        })
      ).id;
      variantId = (
        await prisma.productVariant.create({
          data: {
            productId,
            sku: `PRE-ROUTE-${tag}`,
            attributes: {},
            price: 2000,
          },
        })
      ).id;
      await prisma.storeSetting.upsert({
        where: { id: "singleton" },
        create: { id: "singleton" },
        update: {},
      });
    }, 60000);

    afterAll(async () => {
      await prisma.preorderCampaign.deleteMany({
        where: { id: { in: campaignIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
      await prisma.productVariant.deleteMany({ where: { id: variantId } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }, 60000);

    function request(path: string, cookie: string, body: unknown) {
      return new Request(`http://localhost${path}`, {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    const campaign = (name: string) => ({
      name,
      isActive: false,
      startDate: "2026-12-01",
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
          giftVariantId: null,
          giftLabel: null,
        },
      ],
    });

    it("refuses staff who can't edit coupons", async () => {
      const { POST } = await import("./campaign/route");
      const res = await POST(
        request("/api/preorders/campaign", plainCookie, campaign(`No ${tag}`)),
      );
      expect(res.status).toBe(403);
    });

    it("explains a bad campaign in plain words", async () => {
      const { POST } = await import("./campaign/route");
      const res = await POST(
        request("/api/preorders/campaign", adminCookie, {
          ...campaign(""),
          reserveLow: 0,
        }),
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { errors: Record<string, string> };
      expect(body.errors.name).toBeTruthy();
      expect(body.errors.reserveLow).toBeTruthy();
    });

    it("saves a campaign and prices a pre-order with it", async () => {
      const { POST } = await import("./campaign/route");
      const res = await POST(
        request(
          "/api/preorders/campaign",
          adminCookie,
          campaign(`Route ${tag}`),
        ),
      );
      expect(res.status).toBe(201);
      const { id } = (await res.json()) as { id: string };
      campaignIds.push(id);

      const check = await (
        await import("../discounts/check/route")
      ).POST(
        request("/api/discounts/check", adminCookie, {
          variantId,
          quantity: 2,
          insider: false,
          preorder: true,
          codes: [],
        }),
      );
      expect(check.status).toBe(200);
      const body = (await check.json()) as {
        pricing: { discountTotal: number };
        reserve: { reserveTotal: number };
      };
      expect(body.pricing.discountTotal).toBe(60000);
      // ₹4,000 of products at full price: the smaller reserve.
      expect(body.reserve.reserveTotal).toBe(50000);
    });

    it("lets only order staff send the balance nudge, and needs orders to nudge", async () => {
      const { POST } = await import("./nudge/route");
      const refused = await POST(
        request("/api/preorders/nudge", plainCookie, { orderIds: ["x"] }),
      );
      expect(refused.status).toBe(403);
      const empty = await POST(
        request("/api/preorders/nudge", adminCookie, {}),
      );
      expect(empty.status).toBe(400);
      const none = await POST(
        request("/api/preorders/nudge", adminCookie, {
          orderIds: [`missing-${tag}`],
        }),
      );
      expect(none.status).toBe(200);
      expect(await none.json()).toMatchObject({
        ok: true,
        nudged: 0,
        skipped: 1,
      });
    });
  },
);
