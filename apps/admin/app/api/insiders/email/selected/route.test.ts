// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";
// Never email or WhatsApp anyone from a test: no provider keys, so the
// sender only logs.
delete process.env.RESEND_API_KEY;
delete process.env.INSIDER_EMAIL_FROM;
delete process.env.GUPSHUP_API_KEY;
process.env.INSIDER_LINK_SECRET ??=
  "test-insider-link-secret-at-least-32-chars";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/insiders/email/selected",
  { timeout: 30000 },
  () => {
    const staffIds: string[] = [];
    const entryIds: string[] = [];
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
        `test-sel-staff-${crypto.randomUUID()}@example.com`,
      );
      const adminEmail = `test-sel-admin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: "Selected Test",
          email: `selected-${crypto.randomUUID()}@example.test`,
          phone: `+9197${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
          consentVersion: "test",
          insiderCode: `TSL${String(Math.floor(1000 + Math.random() * 8999))}`,
          submittedAt: new Date("2001-01-01T00:00:00Z"),
        },
      });
      entryIds.push(row.id);
    });

    afterAll(async () => {
      await prisma.waitlistEntry.deleteMany({
        where: { id: { in: entryIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    function post(cookie: string, body: unknown) {
      return import("./route").then(({ POST }) =>
        POST(
          new Request("http://localhost/api/insiders/email/selected", {
            method: "POST",
            headers: { cookie, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        ),
      );
    }

    it("refuses staff who can't manage Insiders", async () => {
      expect((await post(plainCookie, { ids: entryIds })).status).toBe(403);
    });

    it("refuses more than 10 or nobody", async () => {
      expect((await post(adminCookie, { ids: [] })).status).toBe(400);
      const many = Array.from({ length: 11 }, (_, i) => `id-${i}`);
      expect((await post(adminCookie, { ids: many })).status).toBe(400);
      expect((await post(adminCookie, { ids: ["no-such-id"] })).status).toBe(
        400,
      );
    });

    it("sends, marks sent, then asks before sending again", async () => {
      const first = await post(adminCookie, { ids: entryIds });
      expect(first.status).toBe(200);
      expect(((await first.json()) as { sent: number }).sent).toBe(1);
      const row = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: entryIds[0]! },
      });
      expect(row.codeEmailedAt).not.toBeNull();

      const again = await post(adminCookie, { ids: entryIds });
      expect(again.status).toBe(409);
      const resent = await post(adminCookie, { ids: entryIds, resend: true });
      expect(resent.status).toBe(200);
    });
  },
);
