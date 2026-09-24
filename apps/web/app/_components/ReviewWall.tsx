import Image from "next/image";
import type { ReviewListItem } from "@onwei/core";
import { ScrollCarousel } from "./ScrollCarousel";
import { StarRow } from "./StarRow";
import { CtaLink } from "./CtaLink";

// Extracted from the Homepage's ReviewsSection (was page-local, hardcoded
// to one repeated review) — now takes real reviews from
// `listApprovedReviews` and is reused on the PDP and Collection page with
// page-specific heading/share copy (Figma duplicates this section per page
// rather than treating it as Homepage-only).
const TONES = ["purple", "dark"] as const;

function ReviewCard({
  review,
  tone,
}: {
  review: ReviewListItem;
  tone: (typeof TONES)[number];
}) {
  return (
    <div
      className={`flex h-[429px] w-[341px] shrink-0 flex-col items-center justify-center gap-8 rounded-[30px] px-12 pb-10 pt-8 text-center text-onwei-beige ${
        tone === "purple" ? "bg-onwei-purple" : "bg-onwei-blue"
      }`}
    >
      <StarRow count={review.rating} />
      {review.title ? (
        <p className="font-grotesk text-[14px] font-bold">{review.title}</p>
      ) : null}
      <p className="font-grotesk text-[14px]">{review.body}</p>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-display text-[16px] font-semibold uppercase tracking-[-0.16px]">
          {review.authorDisplay ?? "Onwei Customer"}
        </p>
        <div className="flex items-center gap-1">
          <Image
            src="/images/reviews/check.svg"
            alt=""
            width={18}
            height={18}
            aria-hidden
          />
          <span className="font-display text-[16px] font-semibold uppercase tracking-[-0.16px] opacity-70">
            Verified Review
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReviewWall({
  reviews,
  heading,
  shareLabel = "share your Onwei routine",
  ctaLabel = "view all reviews",
  ctaHref = "#",
}: {
  reviews: ReviewListItem[];
  heading: React.ReactNode;
  shareLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  if (reviews.length === 0) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-24 sm:px-6 lg:px-12">
      <div className="flex w-full max-w-[1440px] flex-col items-center gap-8">
        <div className="relative flex w-full flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
              {heading}
            </p>
            <Image
              src="/images/reviews/underline.svg"
              alt=""
              width={526}
              height={4}
              aria-hidden
              className="max-w-full"
            />
          </div>
          <span className="relative flex items-center gap-2 font-script text-script-md uppercase text-onwei-blue">
            {shareLabel}
            <Image
              src="/images/reviews/arrow.svg"
              alt=""
              width={20}
              height={17}
              aria-hidden
              className="-rotate-[30deg]"
            />
          </span>
          <CtaLink href={ctaHref} className="bg-onwei-blue text-onwei-beige">
            {ctaLabel}
          </CtaLink>
        </div>

        <ScrollCarousel>
          {reviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              review={review}
              tone={TONES[index % TONES.length] ?? "purple"}
            />
          ))}
        </ScrollCarousel>
      </div>
    </section>
  );
}
