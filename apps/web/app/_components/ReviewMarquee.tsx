import Image from "@/_components/ScaledImage";
import type { ReviewListItem } from "@onwei/core";

// PDP strip under the product panel (Figma 759:3116): a full-width navy band
// that scrolls review quotes, title over text over reviewer, a divider mark
// between them. Same loop as MarqueeBar, two identical groups moved by
// exactly -50% so the restart is invisible.
const REPEATS = 3;

function QuoteGroup({ reviews }: { reviews: readonly ReviewListItem[] }) {
  const repeated = Array.from({ length: REPEATS }, () => reviews).flat();
  return (
    <div className="flex shrink-0 items-center">
      {repeated.map((review, index) => (
        <div key={index} className="flex shrink-0 items-center">
          <div className="flex w-[17.9375rem] flex-col items-center gap-2 text-center font-grotesk text-[length:max(0.875rem,11px)] text-onwei-white">
            {review.title ? (
              <p className="uppercase leading-[1.2143]">{review.title}</p>
            ) : null}
            <p className="line-clamp-2 leading-[1.2143]">{review.body}</p>
            <p className="text-[length:max(0.75rem,11px)] font-bold uppercase leading-[1.2143]">
              {review.authorDisplay ?? "Onwei Customer"}
            </p>
          </div>
          <Image
            src="/images/hero/marquee-divider.svg"
            alt=""
            width={20}
            height={15}
            className="mx-14"
          />
        </div>
      ))}
    </div>
  );
}

export function ReviewMarquee({
  reviews,
}: {
  reviews: readonly ReviewListItem[];
}) {
  if (reviews.length === 0) return null;
  return (
    <div
      className="w-full overflow-hidden bg-onwei-blue py-[1.4375rem]"
      aria-hidden
    >
      <div className="flex w-max animate-[onwei-marquee_90s_linear_infinite]">
        <QuoteGroup reviews={reviews} />
        <QuoteGroup reviews={reviews} />
      </div>
    </div>
  );
}
