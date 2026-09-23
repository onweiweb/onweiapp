import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  removeReviewPlacement,
  reorderReviewPlacements,
  setReviewPlacement,
  updateReviewSurfaceLimit,
} from "./reviewPlacement";
import { listSurfaceReviews } from "../catalog/listSurfaceReviews";

describe.skipIf(!process.env.DATABASE_URL)(
  "review placements (integration)",
  { timeout: 20000 },
  () => {
    const createdReviewIds: string[] = [];
    const createdPlacementIds: string[] = [];
    let actor: { staffUserId: string };

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-staff-${randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      actor = { staffUserId: staffUser.id };
    });

    afterAll(async () => {
      await prisma.reviewSurfaceConfig.deleteMany({
        where: { surface: "HOME_WALL" },
      });
      await prisma.staffUser.delete({ where: { id: actor.staffUserId } });
    });

    afterEach(async () => {
      await prisma.reviewPlacement.deleteMany({
        where: { id: { in: createdPlacementIds } },
      });
      await prisma.review.deleteMany({
        where: { id: { in: createdReviewIds } },
      });
      createdPlacementIds.length = 0;
      createdReviewIds.length = 0;
    });

    async function createApprovedBrandReview(body: string) {
      const review = await prisma.review.create({
        data: {
          targetType: "BRAND",
          source: "SITE",
          rating: 5,
          body,
          isApproved: true,
        },
      });
      createdReviewIds.push(review.id);
      return review;
    }

    it("features a review onto a surface and rejects a duplicate", async () => {
      const review = await createApprovedBrandReview("Great gear.");

      const placement = await setReviewPlacement(
        { surface: "HOME_WALL", reviewId: review.id },
        actor,
      );
      createdPlacementIds.push(placement.id);

      await expect(
        setReviewPlacement(
          { surface: "HOME_WALL", reviewId: review.id },
          actor,
        ),
      ).rejects.toThrow(/already-featured/);
    });

    it("listSurfaceReviews prefers curated placements over the recency fallback", async () => {
      const recent = await createApprovedBrandReview("Recent, not curated.");
      const curated = await createApprovedBrandReview("Curated pick.");

      const placement = await setReviewPlacement(
        { surface: "HOME_WALL", reviewId: curated.id },
        actor,
      );
      createdPlacementIds.push(placement.id);

      const results = await listSurfaceReviews({ surface: "HOME_WALL" });
      expect(results.map((r) => r.id)).toContain(curated.id);
      expect(results.map((r) => r.id)).not.toContain(recent.id);
    });

    it("falls back to most-recent-approved when nothing is curated", async () => {
      const review = await createApprovedBrandReview("Nothing curated here.");
      // No placements created for PRODUCT_WALL/this product — should still
      // surface real approved reviews rather than an empty list.
      const results = await listSurfaceReviews({ surface: "HOME_WALL" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === review.id)).toBe(true);
    });

    it("reorders placements", async () => {
      const first = await createApprovedBrandReview("First.");
      const second = await createApprovedBrandReview("Second.");

      const p1 = await setReviewPlacement(
        { surface: "HOME_WALL", reviewId: first.id, sortOrder: 0 },
        actor,
      );
      const p2 = await setReviewPlacement(
        { surface: "HOME_WALL", reviewId: second.id, sortOrder: 1 },
        actor,
      );
      createdPlacementIds.push(p1.id, p2.id);

      await reorderReviewPlacements("HOME_WALL", null, [p2.id, p1.id], actor);

      const reordered = await prisma.reviewPlacement.findMany({
        where: { id: { in: [p1.id, p2.id] } },
        orderBy: { sortOrder: "asc" },
      });
      expect(reordered.map((p) => p.id)).toEqual([p2.id, p1.id]);
    });

    it("removes a placement and writes an audit log entry", async () => {
      const review = await createApprovedBrandReview("Remove me.");
      const placement = await setReviewPlacement(
        { surface: "HOME_WALL", reviewId: review.id },
        actor,
      );

      await removeReviewPlacement(placement.id, actor);

      const found = await prisma.reviewPlacement.findUnique({
        where: { id: placement.id },
      });
      expect(found).toBeNull();

      const auditLogs = await prisma.auditLog.findMany({
        where: { entityId: placement.id, action: "reviewPlacement.remove" },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      await prisma.auditLog.deleteMany({ where: { entityId: placement.id } });
    });

    it("updates the surface display limit", async () => {
      const config = await updateReviewSurfaceLimit("HOME_WALL", 3, actor);
      expect(config.limit).toBe(3);

      const updated = await updateReviewSurfaceLimit("HOME_WALL", 5, actor);
      expect(updated.limit).toBe(5);
    });
  },
);
