import { prisma } from "@onwei/database";
import type { ReviewSummary, ReviewListItem } from "./types";

/**
 * Public review reads — only ever `isApproved: true` rows, and only the
 * fields safe to show a visitor (never `customerId`/`approvedBy`). Backs
 * every review-wall instance across Homepage/Collection/PDP: one data layer,
 * different presentation per page.
 */
export async function listApprovedReviews(options: {
  targetType: "PRODUCT" | "BRAND";
  productId?: string;
  limit?: number;
}): Promise<ReviewListItem[]> {
  const reviews = await prisma.review.findMany({
    where: {
      targetType: options.targetType,
      isApproved: true,
      ...(options.productId ? { productId: options.productId } : {}),
    },
    orderBy: { submittedAt: "desc" },
    take: options.limit ?? 10,
  });

  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    authorDisplay: review.authorDisplay,
    submittedAt: review.submittedAt,
  }));
}

/** Pure — no DB round trip. Callers that already have the list can reuse it. */
export function summarizeReviews(reviews: ReviewListItem[]): ReviewSummary {
  if (reviews.length === 0) return { average: 0, count: 0 };
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return { average: total / reviews.length, count: reviews.length };
}
