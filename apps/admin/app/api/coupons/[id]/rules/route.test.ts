// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/coupons/[id]/rules",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdCouponIds: string[] = [];
    const createdRuleIds: string[] = [];

    beforeAll(async () => {
      const email = `test-route-superadmin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = email;
      const staffUser = await prisma.staffUser.create({
        data: { email, passwordHash: "not-a-real-hash", name: "Test Admin" },
      });
      staffUserId = staffUser.id;
      const token = await createStaffSessionToken(
        { staffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      cookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${token}`;
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: [...createdCouponIds, ...createdRuleIds] } },
      });
      await prisma.discountRule.deleteMany({
        where: { id: { in: createdRuleIds } },
      });
      await prisma.coupon.deleteMany({
        where: { id: { in: createdCouponIds } },
      });
      createdCouponIds.length = 0;
      createdRuleIds.length = 0;
    });

    async function createFixtureCoupon() {
      const coupon = await prisma.coupon.create({
        data: { code: `TEST-ROUTE-${crypto.randomUUID()}` },
      });
      createdCouponIds.push(coupon.id);
      return coupon;
    }

    it("adds a valid rule on the happy path", async () => {
      const coupon = await createFixtureCoupon();
      const { POST } = await import("./route");

      const response = await POST(
        new Request(`http://localhost/api/coupons/${coupon.id}/rules`, {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            type: "PERCENTAGE",
            config: { percentage: 15 },
          }),
        }),
        { params: Promise.resolve({ id: coupon.id }) },
      );
      const body = (await response.json()) as {
        rule: { id: string; config: unknown };
      };
      createdRuleIds.push(body.rule.id);

      expect(response.status).toBe(201);
      expect(body.rule.config).toEqual({ percentage: 15 });
    });

    it("returns a plain-language error for an out-of-range percentage", async () => {
      const coupon = await createFixtureCoupon();
      const { POST } = await import("./route");

      const response = await POST(
        new Request(`http://localhost/api/coupons/${coupon.id}/rules`, {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            type: "PERCENTAGE",
            config: { percentage: 500 },
          }),
        }),
        { params: Promise.resolve({ id: coupon.id }) },
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/between 1 and 100/i);
    });
  },
);
