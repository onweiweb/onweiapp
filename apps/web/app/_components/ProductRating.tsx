import Image from "@/_components/ScaledImage";
import type { ReviewSummary } from "@onwei/core";

// Real per-product review data (packages/core's listApprovedReviews, joined
// in by the catalog list functions), renders nothing when a product has no
// approved reviews yet, rather than a fake/invented count.
export function ProductRating({
  summary,
  starSize = 10,
  countClassName = "text-[length:max(0.625rem,11px)]",
}: {
  summary: ReviewSummary;
  // Cards use 10px stars (Figma 417:1675), the PDP panel 11px (759:3040).
  starSize?: number;
  countClassName?: string;
}) {
  const rounded = Math.round(summary.average);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Image
            key={index}
            src={
              index < rounded
                ? "/images/shared/star-card.svg"
                : "/images/shared/star-outline.svg"
            }
            alt=""
            width={starSize}
            height={starSize}
            aria-hidden
          />
        ))}
      </div>
      <span
        className={`font-grotesk leading-[1.36] text-onwei-black ${countClassName}`}
      >
        ({summary.count})
      </span>
    </div>
  );
}
