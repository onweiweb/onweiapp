// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/coupons",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdCouponIds: string[] = [];

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
        where: { entityId: { in: createdCouponIds } },
      });
      await prisma.coupon.deleteMany({
        where: { id: { in: createdCouponIds } },
      });
      createdCouponIds.length = 0;
    });

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/coupons", {
          method: "POST",
          body: JSON.stringify({ code: "TEST" }),
        }),
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 when the code is missing", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/coupons", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({}),
        }),
      );
      expect(response.status).toBe(400);
    });

    it("creates a coupon on the happy path", async () => {
      const { POST } = await import("./route");
      const code = `TEST-${crypto.randomUUID()}`;
      const response = await POST(
        new Request("http://localhost/api/coupons", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ code }),
        }),
      );
      const body = (await response.json()) as {
        coupon: { id: string; code: string };
      };
      createdCouponIds.push(body.coupon.id);

      expect(response.status).toBe(201);
      expect(body.coupon.code).toBe(code);
    });

    it("returns a plain-language error for a duplicate code", async () => {
      const { POST } = await import("./route");
      const code = `TEST-${crypto.randomUUID()}`;

      const first = await POST(
        new Request("http://localhost/api/coupons", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ code }),
        }),
      );
      const firstBody = (await first.json()) as { coupon: { id: string } };
      createdCouponIds.push(firstBody.coupon.id);

      const response = await POST(
        new Request("http://localhost/api/coupons", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ code }),
        }),
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/already in use/i);
    });
  },
);
