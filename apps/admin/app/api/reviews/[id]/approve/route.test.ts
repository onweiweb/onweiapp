// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/reviews/[id]/approve",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdReviewIds: string[] = [];

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
        where: { entityId: { in: createdReviewIds } },
      });
      await prisma.review.deleteMany({
        where: { id: { in: createdReviewIds } },
      });
      createdReviewIds.length = 0;
    });

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/reviews/x/approve", {
          method: "POST",
        }),
        { params: Promise.resolve({ id: "x" }) },
      );
      expect(response.status).toBe(401);
    });

    it("approves a review on the happy path", async () => {
      const review = await prisma.review.create({
        data: {
          targetType: "BRAND",
          source: "EMAIL",
          rating: 5,
          body: "Great.",
        },
      });
      createdReviewIds.push(review.id);
      const { POST } = await import("./route");

      const response = await POST(
        new Request(`http://localhost/api/reviews/${review.id}/approve`, {
          method: "POST",
          headers: { cookie: cookieHeader },
        }),
        { params: Promise.resolve({ id: review.id }) },
      );
      const body = (await response.json()) as {
        review: { isApproved: boolean };
      };

      expect(response.status).toBe(200);
      expect(body.review.isApproved).toBe(true);
    });
  },
);
