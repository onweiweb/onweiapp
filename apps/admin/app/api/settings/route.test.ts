// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";
process.env.SUPERADMIN_EMAIL = "someone-else@example.com";

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/settings",
  { timeout: 20000 },
  () => {
    let staffUserId: string;
    let cookieHeader: string;
    let superAdminStaffUserId: string;
    let superAdminCookieHeader: string;
    let original: Awaited<
      ReturnType<typeof prisma.siteSetting.findUniqueOrThrow>
    >;

    beforeAll(async () => {
      original = await prisma.siteSetting.findUniqueOrThrow({
        where: { id: "singleton" },
      });

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
      await prisma.siteSetting.update({
        where: { id: "singleton" },
        data: {
          siteMode: original.siteMode,
          launchAt: original.launchAt,
          allowInternationalPhone: original.allowInternationalPhone,
        },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: "SiteSetting" },
      });
      await prisma.staffUser.deleteMany({
        where: { id: { in: [staffUserId, superAdminStaffUserId] } },
      });
    });

    afterEach(async () => {
      await prisma.siteSetting.update({
        where: { id: "singleton" },
        data: { siteMode: original.siteMode },
      });
    });

    it("returns 401 with no session cookie", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        new Request("http://localhost/api/settings", {
          method: "PATCH",
          body: JSON.stringify({ siteMode: "LIVE" }),
        }),
      );
      expect(response.status).toBe(401);
    });

    it("returns 403 when the staff user lacks settings:manage", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        new Request("http://localhost/api/settings", {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ siteMode: "LIVE" }),
        }),
      );
      expect(response.status).toBe(403);
    });

    it("updates the site mode and writes an audit log entry", async () => {
      const { PATCH } = await import("./route");
      const before = await prisma.auditLog.count({
        where: { entityType: "SiteSetting" },
      });

      const response = await PATCH(
        new Request("http://localhost/api/settings", {
          method: "PATCH",
          headers: { cookie: superAdminCookieHeader },
          body: JSON.stringify({ siteMode: "PREORDERS" }),
        }),
      );
      const body = (await response.json()) as {
        ok: boolean;
        setting: { siteMode: string };
      };

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.setting.siteMode).toBe("PREORDERS");

      const after = await prisma.auditLog.count({
        where: { entityType: "SiteSetting" },
      });
      expect(after).toBe(before + 1);
    });
  },
);
