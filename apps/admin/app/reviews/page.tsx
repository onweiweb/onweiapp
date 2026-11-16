import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import { REVIEW_SOURCE_LABELS } from "../_lib/reviewLabels";
import { ReviewModerationButtons } from "../_components/ReviewModerationButtons";
import {
  AdminBadge,
  AdminButton,
  AdminPager,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  reviewApprovalTone,
  PageHeader,
} from "../_components/ui";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ isApproved?: string; page?: string }>;
}) {
  await requirePageSession("review:moderate");
  const { isApproved, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const filter =
    isApproved === "true" ? true : isApproved === "false" ? false : undefined;

  const fetched = await prisma.review.findMany({
    where: filter === undefined ? {} : { isApproved: filter },
    include: { product: true },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    ...pageWindow(page),
  });
  const { rows: reviews, hasNext } = trimPage(fetched);
  const waiting = await prisma.review.count({ where: { isApproved: false } });

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Reviews"
        description={
          <>
            Approve or hide reviews before they show on the site. Shoppers can
            write one from the homepage, category pages and product pages.
            {waiting > 0 ? (
              <>
                {" "}
                <Link
                  href="/reviews?isApproved=false"
                  className="font-semibold underline"
                >
                  {waiting} waiting for approval
                </Link>
                .
              </>
            ) : null}
          </>
        }
        actions={
          <>
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
          </>
        }
      />

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
                  <p className="mt-1 text-xs text-onwei-blue/60">
                    {review.authorDisplay ?? "No name"}
                    {review.isVerifiedPurchase
                      ? " · bought and received it"
                      : ""}
                  </p>
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
      <AdminPager
        pathname="/reviews"
        page={page}
        hasNext={hasNext}
        params={{ isApproved }}
      />
    </main>
  );
}
