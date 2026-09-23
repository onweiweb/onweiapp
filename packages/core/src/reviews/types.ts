import type { ReviewTarget, ReviewSurface } from "@onwei/database";

export interface CreateManualReviewInput {
  targetType: ReviewTarget;
  productId?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  authorDisplay?: string | null;
}

export interface CreateReviewPlacementInput {
  surface: ReviewSurface;
  // Required for PRODUCT_WALL, omitted for the two brand-wide surfaces.
  productId?: string | null;
  reviewId: string;
  sortOrder?: number;
}
