import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@onwei/core";
import type { ProductListItem, ReviewSummary } from "@onwei/core";

// Real per-product review data (packages/core's listApprovedReviews, joined
// in by the catalog list functions) — renders nothing when a product has no
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
      <span className="font-grotesk text-[10px] leading-[1.36] text-onwei-black">
        ({summary.count})
      </span>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const price = formatCurrency(product.priceRangeMinorUnits.min, "INR");

  return (
    <div className="flex w-[282px] shrink-0 max-w-[282px] flex-col items-start gap-6">
      <Link
        href={`/product/${product.slug}`}
        className="flex w-full flex-col items-start gap-3"
      >
        <div className="relative h-[315px] w-full overflow-hidden rounded-[30px] bg-[#f0e9da]">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.altText ?? product.name}
              fill
              sizes="282px"
              className="object-contain p-6"
            />
          ) : null}
        </div>
        <div className="flex w-full flex-col items-start gap-2">
          {product.reviewSummary ? (
            <ProductRating summary={product.reviewSummary} />
          ) : null}
          <div className="flex w-full items-start justify-between gap-2 font-display font-medium uppercase text-onwei-blue">
            <p className="min-w-0 flex-1 text-[20px] leading-[1.15]">
              {product.name}
            </p>
            <p className="shrink-0 text-[12px]">{price}</p>
          </div>
        </div>
      </Link>
      {/* Figma labels this "add to cart", but cart/checkout is Phase 2 and
          doesn't exist yet (see CLAUDE.md "Current phase"). It links to the
          product page rather than performing an add-to-cart action — a
          functional stand-in, not a design change. */}
      <Link
        href={`/product/${product.slug}`}
        className="flex w-full items-center justify-center rounded-[30px] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase text-onwei-beige"
      >
        add to cart
      </Link>
    </div>
  );
}
