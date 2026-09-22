// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/staff/[id]",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdStaffUserIds: string[] = [];

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
        where: { entityId: { in: createdStaffUserIds } },
      });
      await prisma.staffUser.deleteMany({
        where: { id: { in: createdStaffUserIds } },
      });
      createdStaffUserIds.length = 0;
    });

    it("returns a plain-language 400 when a staff user tries to deactivate themselves", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        new Request(`http://localhost/api/staff/${staffUserId}`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ isActive: false }),
        }),
        { params: Promise.resolve({ id: staffUserId }) },
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/own account/i);
    });

    it("deactivates a different staff user on the happy path", async () => {
      const other = await prisma.staffUser.create({
        data: {
          email: `test-other-${crypto.randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Other Staff",
        },
      });
      createdStaffUserIds.push(other.id);
      const { PATCH } = await import("./route");

      const response = await PATCH(
        new Request(`http://localhost/api/staff/${other.id}`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ isActive: false }),
        }),
        { params: Promise.resolve({ id: other.id }) },
      );
      const body = (await response.json()) as {
        staffUser: { isActive: boolean };
      };

      expect(response.status).toBe(200);
      expect(body.staffUser.isActive).toBe(false);
    });
  },
);
