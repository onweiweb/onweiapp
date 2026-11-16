import { prisma } from "@onwei/database";
import type { ReviewSource } from "@onwei/database";
import type { ReviewSummary, ReviewListItem } from "./types";

/** The visitor-safe fields of a review row. Never email, customer or IP. */
export function toReviewListItem(review: {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorDisplay: string | null;
  submittedAt: Date;
  source: ReviewSource;
  isVerifiedPurchase: boolean;
}): ReviewListItem {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    authorDisplay: review.authorDisplay,
    submittedAt: review.submittedAt,
    verified: review.source !== "SITE" || review.isVerifiedPurchase,
  };
}

/**
 * Public review reads, only ever `isApproved: true` rows, and only the
 * fields safe to show a visitor (never `customerId`/`approvedBy`). Backs
 * every review-wall instance across Homepage/Collection/PDP: one data layer,
 * different presentation per page.
 */
export async function listApprovedReviews(options: {
  targetType: "PRODUCT" | "BRAND";
  productId?: string;
  /** Reviews of any of these products (a category page). */
  productIds?: string[];
  limit?: number;
}): Promise<ReviewListItem[]> {
  const reviews = await prisma.review.findMany({
    where: {
      targetType: options.targetType,
      isApproved: true,
      ...(options.productId ? { productId: options.productId } : {}),
      ...(options.productIds ? { productId: { in: options.productIds } } : {}),
    },
    orderBy: { submittedAt: "desc" },
    take: options.limit ?? 10,
  });

  return reviews.map(toReviewListItem);
}

/** Pure, no DB round trip. Callers that already have the list can reuse it. */
export function summarizeReviews(reviews: ReviewListItem[]): ReviewSummary {
  if (reviews.length === 0) return { average: 0, count: 0 };
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return { average: total / reviews.length, count: reviews.length };
}
