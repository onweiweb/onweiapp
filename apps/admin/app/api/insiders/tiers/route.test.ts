// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/insiders/tiers",
  { timeout: 20000 },
  () => {
    const staffIds: string[] = [];
    let plainCookie: string;
    let adminCookie: string;

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
      plainCookie = await makeStaff(
        `test-insider-staff-${crypto.randomUUID()}@example.com`,
      );
      const adminEmail = `test-insider-admin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
    });

    afterAll(async () => {
      await prisma.insiderTier.deleteMany({
        where: { label: { startsWith: "Route test" } },
      });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    function post(cookie: string, body: unknown) {
      return import("./route").then(({ POST }) =>
        POST(
          new Request("http://localhost/api/insiders/tiers", {
            method: "POST",
            headers: { cookie, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        ),
      );
    }

    const tier = {
      label: "Route test early",
      startDate: "1980-03-01",
      endDate: "1980-03-10",
      percent: 12,
    };

    it("refuses staff who can't manage the waitlist", async () => {
      const response = await post(plainCookie, tier);
      expect(response.status).toBe(403);
    });

    it("adds a tier, then refuses an overlapping one in plain words", async () => {
      const ok = await post(adminCookie, tier);
      expect(ok.status).toBe(200);

      const clash = await post(adminCookie, {
        ...tier,
        label: "Route test clash",
        startDate: "1980-03-05",
      });
      expect(clash.status).toBe(400);
      const data = (await clash.json()) as { error: string };
      expect(data.error).toContain("overlap");
    });
  },
);
