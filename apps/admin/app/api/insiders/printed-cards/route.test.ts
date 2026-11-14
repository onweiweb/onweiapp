// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

// The happy path fills the dev pool to 500 cards, the same thing staff do
// when they set up the cards. Running it again adds nothing.
describe.skipIf(!process.env.DATABASE_URL)(
  "printed Insider card routes",
  { timeout: 60000 },
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
        `test-cards-staff-${crypto.randomUUID()}@example.com`,
      );
      const adminEmail = `test-cards-admin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    async function fill(cookie: string) {
      const { POST } = await import("./fill/route");
      return POST(
        new Request("http://localhost/api/insiders/printed-cards/fill", {
          method: "POST",
          headers: { cookie },
        }),
      );
    }

    async function exportCsv(cookie: string) {
      const { GET } = await import("./export/route");
      return GET(
        new Request("http://localhost/api/insiders/printed-cards/export", {
          headers: { cookie },
        }),
      );
    }

    it("refuses staff who can't manage the waitlist", async () => {
      expect((await fill(plainCookie)).status).toBe(403);
      expect((await exportCsv(plainCookie)).status).toBe(403);
    });

    it("fills the pool once, then adds nothing", async () => {
      const first = await fill(adminCookie);
      expect(first.status).toBe(200);
      expect(await prisma.insiderCode.count()).toBeGreaterThanOrEqual(500);

      const second = await fill(adminCookie);
      const data = (await second.json()) as {
        ok: boolean;
        addedForMembers: number;
        addedFree: number;
      };
      expect(data.ok).toBe(true);
      expect(data.addedForMembers + data.addedFree).toBe(0);
    });

    it("downloads the printer list with codes only", async () => {
      const response = await exportCsv(adminCookie);
      expect(response.status).toBe(200);
      const text = await response.text();
      const lines = text.replace(/^﻿/, "").split("\r\n");
      expect(lines[0]).toBe('"Card number","Code","QR link"');
      expect(lines.length - 1).toBe(
        await prisma.insiderCode.count({ where: { cardNumber: { gte: 1 } } }),
      );
      expect(lines[1]).toMatch(
        /^"1","[^"]+","https:\/\/[^"]+utm_source=insider-card/,
      );
      expect(text).not.toContain("@");
    });
  },
);
