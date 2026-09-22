// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/staff",
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

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/staff", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 for a short password", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/staff", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            email: `test-new-${crypto.randomUUID()}@example.com`,
            name: "New Staff",
            initialPassword: "short",
          }),
        }),
      );
      expect(response.status).toBe(400);
    });

    it("creates a staff account on the happy path", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/staff", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            email: `test-new-${crypto.randomUUID()}@example.com`,
            name: "New Staff",
            initialPassword: "a-long-enough-password",
          }),
        }),
      );
      const body = (await response.json()) as { staffUser: { id: string } };
      createdStaffUserIds.push(body.staffUser.id);

      expect(response.status).toBe(201);
    });
  },
);
