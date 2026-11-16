// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "GET /api/whatsapp/templates/gupshup",
  { timeout: 20000 },
  () => {
    const staffIds: string[] = [];
    let plainCookie: string;

    beforeAll(async () => {
      const staff = await prisma.staffUser.create({
        data: {
          email: `test-gs-staff-${crypto.randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      staffIds.push(staff.id);
      const token = await createStaffSessionToken(
        { staffUserId: staff.id },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      plainCookie = `${STAFF_SESSION_COOKIE_NAME}=${token}`;
    });

    afterAll(async () => {
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    it("refuses staff who can't manage settings", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/whatsapp/templates/gupshup", {
          headers: { cookie: plainCookie },
        }),
      );
      expect(response.status).toBe(403);
    });
  },
);
