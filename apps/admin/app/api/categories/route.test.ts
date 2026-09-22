// @vitest-environment node
//
// jose's HS256 signing does an `instanceof Uint8Array` check on its key
// material; under jsdom that check fails against Node's native Uint8Array
// (a cross-realm instanceof mismatch) even though the value is structurally
// correct. Matches apps/web's verify-otp/route.test.ts convention.
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";
// Deterministic: this test's fixture staff user must never accidentally
// match the real super-admin email from a locally-sourced .env.
process.env.SUPERADMIN_EMAIL = "someone-else@example.com";

describe.skipIf(!process.env.DATABASE_URL)(
  "GET/POST /api/categories",
  { timeout: 20000 },
  () => {
    let staffUserId: string;
    let cookieHeader: string;
    let superAdminStaffUserId: string;
    let superAdminCookieHeader: string;
    const createdCategoryIds: string[] = [];

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-route-staff-${crypto.randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      staffUserId = staffUser.id;
      // This fixture's email won't match SUPERADMIN_EMAIL and it has no
      // assigned roles, so getStaffPermissions returns an empty list for
      // it — exactly what's needed to exercise the real 403 path below.
      const token = await createStaffSessionToken(
        { staffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      cookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${token}`;

      // A separate, privileged fixture for tests that need to get past the
      // permission check to exercise the route's own validation logic.
      const superAdminEmail = `test-route-superadmin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = superAdminEmail;
      const superAdmin = await prisma.staffUser.create({
        data: {
          email: superAdminEmail,
          passwordHash: "not-a-real-hash",
          name: "Test Admin",
        },
      });
      superAdminStaffUserId = superAdmin.id;
      const superAdminToken = await createStaffSessionToken(
        { staffUserId: superAdminStaffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      superAdminCookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${superAdminToken}`;
    });

    afterAll(async () => {
      await prisma.staffUser.deleteMany({
        where: { id: { in: [staffUserId, superAdminStaffUserId] } },
      });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: createdCategoryIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdCategoryIds.length = 0;
    });

    it("returns 401 with no session cookie", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/categories"),
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 when the staff user lacks category:create", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/categories", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            name: "Should Fail",
            slug: `should-fail-${crypto.randomUUID()}`,
          }),
        }),
      );
      expect(response.status).toBe(403);
    });

    it("returns 400 for a POST missing a name or slug", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/categories", {
          method: "POST",
          headers: { cookie: superAdminCookieHeader },
          body: JSON.stringify({ name: "" }),
        }),
      );
      expect(response.status).toBe(400);
    });

    it("returns 200 and the seeded categories for an authenticated GET", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/categories", {
          headers: { cookie: cookieHeader },
        }),
      );
      const body = (await response.json()) as {
        ok: boolean;
        categories: unknown[];
      };
      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.categories)).toBe(true);
    });
  },
);
