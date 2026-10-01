import Image from "@/_components/ScaledImage";
import type { ReviewListItem } from "@onwei/core";
import { ScrollCarousel } from "./ScrollCarousel";
import { StarRow } from "./StarRow";
import { CtaLink } from "./CtaLink";

// Extracted from the Homepage's ReviewsSection (was page-local, hardcoded
// to one repeated review), now takes real reviews from
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
      className={`flex h-[19.8125rem] w-[16.875rem] shrink-0 flex-col items-center justify-center gap-6 rounded-[1.875rem] px-6 pb-10 pt-8 text-center desk:h-[26.8125rem] desk:w-[21.3125rem] desk:gap-8 desk:px-12 text-onwei-beige ${
        tone === "purple" ? "bg-onwei-purple" : "bg-onwei-blue"
      }`}
    >
      <StarRow count={review.rating} />
      {review.title ? (
        <p className="font-grotesk text-[length:max(0.875rem,11px)] font-bold">
          {review.title}
        </p>
      ) : null}
      <p className="font-grotesk text-[length:max(0.875rem,11px)]">
        {review.body}
      </p>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-display text-[length:max(1rem,11px)] font-semibold uppercase tracking-[-0.01rem]">
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
          <span className="font-display text-[length:max(1rem,11px)] font-semibold uppercase tracking-[-0.01rem] opacity-70">
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
    <section className="relative flex flex-col items-center bg-onwei-white px-3 pb-14 pt-24 desk:px-12 desk:pb-24">
      {/* Mobile frame (node 761:5065): the share note and curly arrow are
          absolutely placed around the centered heading, the button moves
          below the carousel. From desk up the original inline row is used. */}
      <p
        aria-hidden
        className="absolute left-[46.7%] top-[2.8125rem] whitespace-pre font-script text-[1rem] uppercase leading-[1.2] text-onwei-blue desk:hidden"
      >
        {"Share your Onwei routine\nand get rewarded"}
      </p>
      <Image
        src="/images/reviews/arrow-mobile.svg"
        alt=""
        width={29}
        height={49}
        aria-hidden
        className="absolute right-[2.0563rem] top-[5.519rem] h-[3.0463rem] w-[1.8351rem] -rotate-[117.97deg] desk:hidden"
      />
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-8">
        <div className="relative flex w-full flex-col items-center gap-6 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between">
          <div className="flex flex-col items-center gap-2 desk:items-start">
            <p className="text-center font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-left desk:text-display-md">
              {heading}
            </p>
            <Image
              src="/images/reviews/underline.svg"
              alt=""
              width={526}
              height={4}
              aria-hidden
              className="h-[0.125rem] w-[20.625rem] max-w-full desk:h-auto desk:w-[32.875rem]"
            />
          </div>
          <span className="relative hidden items-center gap-2 font-script text-script-md uppercase text-onwei-blue desk:flex">
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
          <CtaLink
            href={ctaHref}
            className="bg-onwei-blue text-onwei-beige max-desk:hidden"
          >
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
        <CtaLink
          href={ctaHref}
          className="w-full bg-onwei-blue text-onwei-beige desk:hidden"
        >
          {ctaLabel}
        </CtaLink>
      </div>
    </section>
  );
}
