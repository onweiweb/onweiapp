import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { formatCurrency } from "@onwei/core";
import type { ProductListItem, ReviewSummary } from "@onwei/core";

// Real per-product review data (packages/core's listApprovedReviews, joined
// in by the catalog list functions), renders nothing when a product has no
// approved reviews yet, rather than a fake/invented count.
function ProductRating({ summary }: { summary: ReviewSummary }) {
  const rounded = Math.round(summary.average);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Image
            key={index}
            src={
              index < rounded
                ? "/images/shared/star-full.svg"
                : "/images/shared/star-outline.svg"
            }
            alt=""
            width={10}
            height={10}
            aria-hidden
          />
        ))}
      </div>
      <span className="font-grotesk text-[length:max(0.625rem,11px)] leading-[1.36] text-onwei-black">
        ({summary.count})
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  eager = false,
}: {
  product: ProductListItem;
  // Pass true only from a caller that's actually inside a horizontally-
  // scrolling row (ScrollCarousel, or a manual overflow-x-auto row that's
  // genuinely scrolling at the current breakpoint), next/image's default
  // lazy loading uses an IntersectionObserver against the browser viewport,
  // which never fires for a card positioned off-screen to the right, so it
  // stays blank until scrolled into view. Defaulting to eager everywhere
  // (the previous behavior) forced every product image sitewide to load
  // immediately regardless of position, including non-scrolling grids and
  // below-the-fold sections like RelatedProducts.
  eager?: boolean;
}) {
  const price = formatCurrency(product.priceRangeMinorUnits.min, "INR");

  return (
    <div className="flex w-[14.375rem] max-w-[14.375rem] shrink-0 flex-col items-start gap-3 desk:w-[17.625rem] desk:max-w-[17.625rem] desk:gap-6">
      <Link
        href={`/product/${product.slug}`}
        className="flex w-full flex-col items-start gap-3"
      >
        <div className="relative h-[16.0625rem] w-full overflow-hidden rounded-[1.25rem] bg-onwei-green desk:h-[19.6875rem] desk:rounded-[1.875rem] desk:bg-[#f0e9da]">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.altText ?? product.name}
              fill
              sizes="282px"
              loading={eager ? "eager" : "lazy"}
              className="object-contain p-6"
            />
          ) : null}
        </div>
        <div className="flex w-full flex-col items-start gap-2">
          {product.reviewSummary ? (
            <ProductRating summary={product.reviewSummary} />
          ) : null}
          <div className="flex w-full items-start justify-between gap-2 font-display font-medium uppercase text-onwei-blue">
            <p className="min-w-0 flex-1 text-[1.125rem] leading-[1.15] desk:text-[1.25rem]">
              {product.name}
            </p>
            <p className="shrink-0 text-[length:max(0.75rem,11px)]">{price}</p>
          </div>
        </div>
      </Link>
      {/* Figma labels this "add to cart", but cart/checkout is Phase 2 and
          doesn't exist yet (see CLAUDE.md "Current phase"). It links to the
          product page rather than performing an add-to-cart action, a
          functional stand-in, not a design change. */}
      <Link
        href={`/product/${product.slug}`}
        className="flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase text-onwei-beige"
      >
        add to cart
      </Link>
    </div>
  );
}
