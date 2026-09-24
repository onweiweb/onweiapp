import { prisma } from "@onwei/database";
import { resolveSurfaceLimit } from "@onwei/core";
import type { ReviewSurface } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { ReviewPlacementManager } from "../../_components/ReviewPlacementManager";

async function loadSurface(surface: ReviewSurface) {
  const [approvedReviews, placements, limit] = await Promise.all([
    prisma.review.findMany({
      where: { targetType: "BRAND", isApproved: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.reviewPlacement.findMany({
      where: { surface, productId: null },
      include: { review: true },
      orderBy: { sortOrder: "asc" },
    }),
    resolveSurfaceLimit(surface),
  ]);

  const featuredReviewIds = new Set(placements.map((p) => p.reviewId));

  return {
    placements: placements.map((p) => ({
      placementId: p.id,
      reviewId: p.reviewId,
      rating: p.review.rating,
      title: p.review.title,
      body: p.review.body,
      authorDisplay: p.review.authorDisplay,
    })),
    candidates: approvedReviews
      .filter((review) => !featuredReviewIds.has(review.id))
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        authorDisplay: review.authorDisplay,
      })),
    limit,
  };
}

export default async function ReviewPlacementsPage() {
  await requirePageSession("review:feature");

  const [hero, wall] = await Promise.all([
    loadSurface("HOME_HERO"),
    loadSurface("HOME_WALL"),
  ]);

  return (
    <main className="flex flex-col gap-10">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Homepage review placements
      </h1>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hero testimonial</h2>
          <p className="text-sm text-onwei-blue/70">
            The single featured review shown on the homepage hero — most
            surfaces only need one review picked here.
          </p>
        </div>
        <ReviewPlacementManager surface="HOME_HERO" {...hero} />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Review wall</h2>
          <p className="text-sm text-onwei-blue/70">
            The grid of reviews further down the homepage.
          </p>
        </div>
        <ReviewPlacementManager surface="HOME_WALL" {...wall} />
      </div>
    </main>
  );
}
