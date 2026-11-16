import { Fragment } from "react";
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
// Figma's "Component 703" (node 758:2378) runs purple, purple, navy cards.
const TONES = ["purple", "purple", "dark"] as const;

// Lifestyle photo tiles Figma slots between the review cards (498x429, same
// height as a card). They are fixed brand shots, not CMS content.
const PHOTOS = [
  {
    src: "/images/reviews/photo-1.png",
    alt: "Hands smoothing out a rolled yoga mat",
  },
  {
    src: "/images/reviews/photo-2.png",
    alt: "Blurred motion shot of an athlete on court",
  },
  {
    src: "/images/reviews/photo-1.png",
    alt: "Hands smoothing out a rolled yoga mat",
  },
] as const;

function PhotoTile({ photo }: { photo: (typeof PHOTOS)[number] }) {
  return (
    <div className="relative h-[19.8125rem] w-[21.9375rem] shrink-0 overflow-hidden rounded-[1.875rem] desk:h-[26.8125rem] desk:w-[31.125rem]">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="498px"
        loading="eager"
        className="object-cover"
      />
    </div>
  );
}

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
      <StarRow count={review.rating} shrinkOnMobile />
      {review.title ? (
        <p className="font-grotesk text-body font-bold">{review.title}</p>
      ) : null}
      <p className="font-grotesk text-body">{review.body}</p>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-display text-[length:max(1rem,11px)] font-semibold uppercase tracking-[-0.01rem]">
          {review.authorDisplay ?? "Onwei Customer"}
        </p>
        {review.verified ? (
          <div className="flex items-center gap-1">
            <Image
              src="/images/reviews/check.svg"
              alt=""
              width={18}
              height={18}
              aria-hidden
            />
            <span className="font-display text-[length:max(1rem,11px)] font-normal uppercase tracking-[-0.01rem] opacity-70">
              Verified Review
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ReviewWall({
  reviews,
  heading,
  ctaLabel = "view all reviews",
  ctaHref = "#",
  writeReview,
}: {
  reviews: ReviewListItem[];
  heading: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  /** The "Write a review" button (client feedback 2026-11-16). */
  writeReview?: React.ReactNode;
}) {
  // With a write button the section shows even before the first review.
  if (reviews.length === 0 && !writeReview) return null;

  return (
    <section className="relative flex flex-col items-center bg-onwei-white px-3 pb-14 pt-24 desk:px-12 desk:pb-24">
      {/* Client feedback 2026-11-16: the "share your Onwei routine" note
          and its arrows are gone, a Write a review button sits beside
          View all reviews instead. */}
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-8">
        <div className="relative flex w-full flex-col items-center gap-6 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between">
          <div className="flex flex-col items-center desk:relative desk:items-start">
            <p className="text-center font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-left desk:text-display-md">
              {heading}
            </p>
            {/* Desktop (node 758:2377): the underline hangs 5.6px under the
                heading without taking row height. */}
            <Image
              src="/images/reviews/underline.svg"
              alt=""
              width={526}
              height={4}
              aria-hidden
              className="h-[0.125rem] w-[20.625rem] max-w-full desk:absolute desk:left-px desk:top-[7.6019rem] desk:h-auto desk:w-[32.875rem]"
            />
          </div>
          <div className="flex items-center gap-3 max-desk:hidden">
            {writeReview}
            {reviews.length > 0 ? (
              <CtaLink
                href={ctaHref}
                className="bg-onwei-blue text-onwei-beige"
              >
                {ctaLabel}
              </CtaLink>
            ) : null}
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center font-grotesk text-body text-onwei-blue">
            No reviews here yet. Tried our gear? Be the first to write one.
          </p>
        ) : null}
        <ScrollCarousel
          wrapperClassName="w-full desk:gap-8"
          trackClassName="max-desk:hidden"
        >
          {reviews.map((review, index) => (
            <Fragment key={review.id}>
              <ReviewCard
                review={review}
                tone={TONES[index % TONES.length] ?? "purple"}
              />
              <PhotoTile photo={PHOTOS[index % PHOTOS.length]!} />
            </Fragment>
          ))}
        </ScrollCarousel>
        <div className="flex w-full flex-col gap-3 desk:hidden [&>button]:w-full">
          {reviews.length > 0 ? (
            <CtaLink
              href={ctaHref}
              className="w-full bg-onwei-blue text-onwei-beige max-desk:py-2.5"
            >
              {ctaLabel}
            </CtaLink>
          ) : null}
          {writeReview}
        </div>
      </div>
    </section>
  );
}
