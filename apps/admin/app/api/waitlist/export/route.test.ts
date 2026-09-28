// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";
process.env.SUPERADMIN_EMAIL = "someone-else@example.com";

describe.skipIf(!process.env.DATABASE_URL)(
  "GET /api/waitlist/export",
  { timeout: 20000 },
  () => {
    let staffUserId: string;
    let cookieHeader: string;
    let superAdminStaffUserId: string;
    let superAdminCookieHeader: string;

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-route-staff-${crypto.randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      staffUserId = staffUser.id;
      const token = await createStaffSessionToken(
        { staffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      cookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${token}`;

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

    it("returns 401 with no session cookie", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/waitlist/export"),
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 when the staff user lacks waitlist:view", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/waitlist/export", {
          headers: { cookie: cookieHeader },
        }),
      );
      expect(response.status).toBe(403);
    });

    it("returns a CSV attachment for an authorized staff user", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/waitlist/export", {
          headers: { cookie: superAdminCookieHeader },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain(
        "attachment",
      );
      const body = await response.text();
      expect(body.split("\n")[0]).toContain("Full name");
    });
  },
);
