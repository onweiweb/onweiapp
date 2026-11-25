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
  "Insider applications and invite reward routes",
  { timeout: 60000 },
  () => {
    const staffIds: string[] = [];
    const ruleIds: string[] = [];
    let plainCookie: string;
    let adminCookie: string;
    let applicationId: string;

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

    function request(path: string, cookie: string, body: unknown) {
      return new Request(`http://localhost${path}`, {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    beforeAll(async () => {
      plainCookie = await makeStaff(`test-app-staff-${tag}@example.com`);
      const adminEmail = `test-app-admin-${tag}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
      applicationId = (
        await prisma.waitlistEntry.create({
          data: {
            fullName: "Test Applicant",
            email: `test-app-${tag}@example.com`,
            phone: `+919${Math.floor(100000000 + Math.random() * 900000000)}`,
            consentVersion: "test",
            status: "APPLIED",
            activity: "Yoga",
            joinReasons: ["Events access"],
          },
        })
      ).id;
    }, 60000);

    afterAll(async () => {
      await prisma.insiderRewardRule.deleteMany({
        where: { id: { in: ruleIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.waitlistEntry.deleteMany({ where: { id: applicationId } });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    }, 60000);

    it("refuses staff who can't manage Insiders", async () => {
      const { POST } = await import("./route");
      const res = await POST(
        request("/api/insiders/applications", plainCookie, {
          action: "reject",
          ids: [applicationId],
        }),
      );
      expect(res.status).toBe(403);
    });

    it("rejects an application once, then reports it as already reviewed", async () => {
      const { POST } = await import("./route");
      const first = await POST(
        request("/api/insiders/applications", adminCookie, {
          action: "reject",
          ids: [applicationId],
        }),
      );
      expect(await first.json()).toMatchObject({ ok: true, rejected: 1 });
      const again = await POST(
        request("/api/insiders/applications", adminCookie, {
          action: "approve",
          ids: [applicationId],
        }),
      );
      expect(await again.json()).toMatchObject({
        ok: true,
        approved: 0,
        skipped: 1,
      });
    });

    it("saves an invite reward and explains a bad one", async () => {
      const { POST } = await import("../rewards/route");
      const bad = await POST(
        request("/api/insiders/rewards", adminCookie, {
          invites: 0,
          rewardType: "AMOUNT_OFF",
          value: 500,
          freeVariantId: null,
          validDays: 90,
          isActive: false,
        }),
      );
      expect(bad.status).toBe(400);
      expect(
        ((await bad.json()) as { errors: Record<string, string> }).errors
          .invites,
      ).toBeTruthy();
      const good = await POST(
        request("/api/insiders/rewards", adminCookie, {
          invites: 10,
          rewardType: "AMOUNT_OFF",
          value: 500,
          freeVariantId: null,
          validDays: 90,
          isActive: false,
        }),
      );
      expect(good.status).toBe(201);
      ruleIds.push(((await good.json()) as { id: string }).id);
    });
  },
);
