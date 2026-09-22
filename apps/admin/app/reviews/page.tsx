import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { REVIEW_SOURCE_LABELS } from "../_lib/reviewLabels";
import { ReviewModerationButtons } from "../_components/ReviewModerationButtons";
import {
  AdminBadge,
  AdminButton,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  reviewApprovalTone,
} from "../_components/ui";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ isApproved?: string }>;
}) {
  await requirePageSession("review:moderate");
  const { isApproved } = await searchParams;
  const filter =
    isApproved === "true" ? true : isApproved === "false" ? false : undefined;

  const reviews = await prisma.review.findMany({
    where: filter === undefined ? {} : { isApproved: filter },
    include: { product: true },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold uppercase">
          Reviews
        </h1>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2">
            <AdminSelect name="isApproved" defaultValue={isApproved ?? ""}>
              <option value="">All</option>
              <option value="false">Awaiting review</option>
              <option value="true">Live</option>
            </AdminSelect>
            <AdminButton type="submit" variant="secondary">
              Filter
            </AdminButton>
          </form>
          <Link href="/reviews/new">
            <AdminButton>Add review</AdminButton>
          </Link>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-onwei-blue/70">No reviews match that filter.</p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>For</AdminTableHeaderCell>
            <AdminTableHeaderCell>Rating</AdminTableHeaderCell>
            <AdminTableHeaderCell>Review</AdminTableHeaderCell>
            <AdminTableHeaderCell>Source</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {reviews.map((review) => (
              <AdminTableRow key={review.id}>
                <AdminTableCell>
                  {review.product?.name ?? "Onwei (brand)"}
                </AdminTableCell>
                <AdminTableCell>{review.rating} / 5</AdminTableCell>
                <AdminTableCell className="max-w-xs">
                  {review.title ? (
                    <p className="font-medium">{review.title}</p>
                  ) : null}
                  <p className="text-onwei-blue/70">{review.body}</p>
                </AdminTableCell>
                <AdminTableCell>
                  {REVIEW_SOURCE_LABELS[review.source]}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={reviewApprovalTone(review.isApproved)}>
                    {review.isApproved ? "Live" : "Awaiting review"}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  <ReviewModerationButtons
                    reviewId={review.id}
                    isApproved={review.isApproved}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
