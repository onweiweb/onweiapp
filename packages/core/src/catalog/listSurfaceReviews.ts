import { prisma } from "@onwei/database";
import type { ReviewSurface } from "@onwei/database";
import { listApprovedReviews } from "./listApprovedReviews";
import type { ReviewListItem } from "./types";

export const DEFAULT_SURFACE_LIMITS: Record<ReviewSurface, number> = {
  HOME_HERO: 1,
  HOME_WALL: 8,
  PRODUCT_WALL: 6,
};

/**
 * Storefront read for a review surface: curated ReviewPlacement rows if any
 * exist for this surface (+ product, for PRODUCT_WALL), otherwise the
 * most-recent-approved reviews — so a surface with nothing curated yet
 * still shows real content instead of going blank. One data layer behind
 * every review-wall/testimonial instance across Homepage/PDP.
 */
export async function listSurfaceReviews(options: {
  surface: ReviewSurface;
  // Required in practice for PRODUCT_WALL, ignored for the two brand-wide
  // surfaces.
  productId?: string;
}): Promise<ReviewListItem[]> {
  const config = await prisma.reviewSurfaceConfig.findUnique({
    where: { surface: options.surface },
  });
  const limit = config?.limit ?? DEFAULT_SURFACE_LIMITS[options.surface];

  const placements = await prisma.reviewPlacement.findMany({
    where: {
      surface: options.surface,
      productId: options.surface === "PRODUCT_WALL" ? options.productId : null,
      review: { isApproved: true },
    },
    include: { review: true },
    orderBy: { sortOrder: "asc" },
    take: limit,
  });

  if (placements.length > 0) {
    return placements.map(({ review }) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      authorDisplay: review.authorDisplay,
      submittedAt: review.submittedAt,
    }));
  }

  return listApprovedReviews({
    targetType: options.surface === "PRODUCT_WALL" ? "PRODUCT" : "BRAND",
    productId:
      options.surface === "PRODUCT_WALL" ? options.productId : undefined,
    limit,
  });
}
