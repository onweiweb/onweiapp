// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/messages/[id]",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    let messageId: string;

    beforeAll(async () => {
      const email = `test-route-superadmin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = email;
      const staffUser = await prisma.staffUser.create({
        data: { email, passwordHash: "not-a-real-hash", name: "Test Admin" },
      });
      staffUserId = staffUser.id;
      cookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${await createStaffSessionToken(
        { staffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      )}`;
      const message = await prisma.contactMessage.create({
        data: {
          fullName: "Test Person",
          email: `test-msg-${crypto.randomUUID()}@example.com`,
          message: "Hello",
        },
      });
      messageId = message.id;
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({ where: { entityId: messageId } });
      await prisma.contactMessage.deleteMany({ where: { id: messageId } });
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    function patch(status: string, withCookie = true) {
      return import("./route").then(({ PATCH }) =>
        PATCH(
          new Request(`http://localhost/api/messages/${messageId}`, {
            method: "PATCH",
            headers: withCookie ? { cookie: cookieHeader } : {},
            body: JSON.stringify({ status }),
          }),
          { params: Promise.resolve({ id: messageId }) },
        ),
      );
    }

    it("returns 401 without a session", async () => {
      expect((await patch("REPLIED", false)).status).toBe(401);
    });

    it("marks a message replied, then refuses the same change twice", async () => {
      expect((await patch("REPLIED")).status).toBe(200);
      const row = await prisma.contactMessage.findUniqueOrThrow({
        where: { id: messageId },
      });
      expect(row.status).toBe("REPLIED");
      expect(row.repliedByStaffId).toBe(staffUserId);
      expect((await patch("REPLIED")).status).toBe(409);
    });
  },
);
