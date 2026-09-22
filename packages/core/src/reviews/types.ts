import type { ReviewTarget } from "@onwei/database";

export interface CreateManualReviewInput {
  targetType: ReviewTarget;
  productId?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  authorDisplay?: string | null;
}
