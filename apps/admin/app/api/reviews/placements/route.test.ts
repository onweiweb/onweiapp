// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/reviews/placements",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdReviewIds: string[] = [];
    const createdPlacementIds: string[] = [];

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
        where: { entityId: { in: createdPlacementIds } },
      });
      await prisma.reviewPlacement.deleteMany({
        where: { id: { in: createdPlacementIds } },
      });
      await prisma.review.deleteMany({
        where: { id: { in: createdReviewIds } },
      });
      createdPlacementIds.length = 0;
      createdReviewIds.length = 0;
    });

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/reviews/placements", {
          method: "POST",
        }),
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 when reviewId is missing", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/reviews/placements", {
          method: "POST",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ surface: "HOME_WALL" }),
        }),
      );
      expect(response.status).toBe(400);
    });

    it("features a review on the happy path", async () => {
      const review = await prisma.review.create({
        data: {
          targetType: "BRAND",
          source: "EMAIL",
          rating: 5,
          body: "Great.",
          isApproved: true,
        },
      });
      createdReviewIds.push(review.id);
      const { POST } = await import("./route");

      const response = await POST(
        new Request("http://localhost/api/reviews/placements", {
          method: "POST",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ surface: "HOME_WALL", reviewId: review.id }),
        }),
      );
      const body = (await response.json()) as { placement: { id: string } };
      expect(response.status).toBe(201);
      createdPlacementIds.push(body.placement.id);
    });
  },
);
