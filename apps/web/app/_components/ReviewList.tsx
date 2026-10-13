import Image from "@/_components/ScaledImage";
import type { ReviewListItem } from "@onwei/core";
import { CtaLink } from "./CtaLink";

// PDP review rows (Figma "B", node 759:3207 inside 2015:852): a green band
// with white rows, each with the reviewer and stars on the left, a rule, then
// the title and text. Figma also shows two photo thumbnails per row, there is
// no review-photo model yet (a schema change), so they are left out rather
// than faked.
function ReviewRow({ review }: { review: ReviewListItem }) {
  return (
    <article className="flex flex-col gap-8 rounded-[1.875rem] bg-onwei-white p-6 desk:flex-row desk:gap-[7.5rem] desk:p-12">
      <div className="flex shrink-0 flex-col items-start gap-6 desk:w-[18.75rem] desk:gap-12 desk:self-stretch desk:border-r desk:border-onwei-blue">
        <div className="flex w-full flex-col gap-[0.3125rem] font-display font-medium text-onwei-blue desk:w-[5.875rem] desk:items-end">
          <p className="w-full text-[1.25rem] uppercase">
            {review.authorDisplay ?? "Onwei Customer"}
          </p>
          <p className="w-full text-[length:max(0.875rem,11px)] leading-[1.3]">
            Verified Buyer
          </p>
        </div>
        <div className="flex gap-0">
          {Array.from({ length: review.rating }).map((_, index) => (
            <Image
              key={index}
              src="/images/shared/star-full-dark.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden
            />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 text-onwei-blue">
        {review.title ? (
          <p className="font-display text-[1.5rem] font-medium uppercase leading-none">
            {review.title}
          </p>
        ) : null}
        <p className="font-cta text-[length:max(0.875rem,11px)] font-medium leading-[1.3]">
          {review.body}
        </p>
      </div>
    </article>
  );
}

export function ReviewList({
  reviews,
  heading,
  max = 3,
}: {
  reviews: ReviewListItem[];
  heading: string;
  max?: number;
}) {
  if (reviews.length === 0) return null;
  return (
    <section className="flex flex-col items-center bg-onwei-green px-3 py-14 desk:px-14 desk:py-[4.5rem]">
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-10">
        <div className="flex w-full flex-col items-start gap-6 desk:flex-row desk:items-center desk:justify-between">
          <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:w-[33.3125rem] desk:text-display-md">
            {heading}
          </p>
          <CtaLink
            href="#"
            className="bg-onwei-blue text-onwei-white desk:w-[13.9375rem]"
          >
            write a review
          </CtaLink>
        </div>
        <div className="flex w-full flex-col gap-6">
          {reviews.slice(0, max).map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </div>
        <CtaLink
          href="#"
          className="bg-onwei-blue text-onwei-white desk:w-[13.9375rem]"
        >
          view all
        </CtaLink>
      </div>
    </section>
  );
}
