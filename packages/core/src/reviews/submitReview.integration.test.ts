import { prisma } from "@onwei/database";
import { afterAll, describe, expect, it } from "vitest";
import { submitSiteReview } from "./submitReview";
import { toReviewListItem } from "../catalog/listApprovedReviews";

describe.skipIf(!process.env.DATABASE_URL)(
  "submitSiteReview (integration)",
  { timeout: 20000 },
  () => {
    const ids: string[] = [];
    const consent = { version: "privacy:test", ipAddress: "127.0.0.1" };

    afterAll(async () => {
      await prisma.review.deleteMany({ where: { id: { in: ids } } });
    });

    it("saves a brand review held for approval, not verified", async () => {
      const result = await submitSiteReview(
        {
          rating: 4,
          body: "Comfortable and grippy, love it.",
          name: "Test Writer",
          email: "Writer@Example.com",
        },
        consent,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      ids.push(result.id);
      const row = await prisma.review.findUniqueOrThrow({
        where: { id: result.id },
      });
      expect(row).toMatchObject({
        targetType: "BRAND",
        source: "SITE",
        isApproved: false,
        isVerifiedPurchase: false,
        email: "writer@example.com",
        consentVersion: "privacy:test",
      });
      expect(toReviewListItem(row).verified).toBe(false);
      expect(toReviewListItem(row)).not.toHaveProperty("email");
    });

    it("refuses a product that doesn't exist", async () => {
      const result = await submitSiteReview(
        {
          rating: 5,
          body: "Great paddle, really light.",
          name: "Test Writer",
          email: "writer@example.com",
          productId: "no-such-product",
        },
        consent,
      );
      expect(result).toEqual({ ok: false, reason: "UNKNOWN_PRODUCT" });
    });

    it("does not mark verified without a delivered order", async () => {
      const product = await prisma.product.findFirst({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true },
      });
      if (!product) return;
      const result = await submitSiteReview(
        {
          rating: 5,
          body: "Great paddle, really light.",
          name: "Test Writer",
          email: `nobody-${Date.now()}@example.com`,
          productId: product.id,
        },
        consent,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      ids.push(result.id);
      const row = await prisma.review.findUniqueOrThrow({
        where: { id: result.id },
      });
      expect(row.targetType).toBe("PRODUCT");
      expect(row.isVerifiedPurchase).toBe(false);
    });
  },
);
