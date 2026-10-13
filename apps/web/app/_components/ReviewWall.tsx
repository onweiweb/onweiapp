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
          {/* Desktop (node 758:2374, 758:2375): note over the heading's top
              right and a curly arrow, both absolute to the header row. */}
          <span className="absolute left-[33rem] top-[-0.7269rem] hidden whitespace-nowrap font-script text-script-md uppercase leading-[1.2] text-onwei-blue desk:block">
            {shareLabel}
          </span>
          <Image
            src="/images/reviews/arrow-desktop.svg"
            alt=""
            width={50}
            height={83}
            aria-hidden
            className="absolute left-[35.77rem] top-[1.945rem] hidden -rotate-[117.97deg] desk:block"
          />
          <CtaLink
            href={ctaHref}
            className="bg-onwei-blue text-onwei-beige max-desk:hidden"
          >
            {ctaLabel}
          </CtaLink>
        </div>

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
        <CtaLink
          href={ctaHref}
          className="w-full bg-onwei-blue text-onwei-beige max-desk:py-2.5 desk:hidden"
        >
          {ctaLabel}
        </CtaLink>
      </div>
    </section>
  );
}
