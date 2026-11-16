// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/insiders/updates",
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
        `test-upd-staff-${crypto.randomUUID()}@example.com`,
      );
      const adminEmail = `test-upd-admin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
    });

    afterAll(async () => {
      await prisma.insiderUpdate.deleteMany({
        where: { title: { startsWith: "Route test" } },
      });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    function post(cookie: string, body: unknown) {
      return import("./route").then(({ POST }) =>
        POST(
          new Request("http://localhost/api/insiders/updates", {
            method: "POST",
            headers: { cookie, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        ),
      );
    }

    const update = {
      title: "Route test meetup",
      body: "Pickleball morning, all levels.",
      eventDate: "2026-12-05",
      linkUrl: "/insiders",
      isActive: true,
    };

    it("refuses staff who can't manage Insiders", async () => {
      expect((await post(plainCookie, update)).status).toBe(403);
    });

    it("saves an update, and refuses an unsafe link in plain words", async () => {
      expect((await post(adminCookie, update)).status).toBe(201);
      const bad = await post(adminCookie, {
        ...update,
        linkUrl: "javascript:x",
      });
      expect(bad.status).toBe(400);
      expect(((await bad.json()) as { error: string }).error).toMatch(/https/);
    });
  },
);
