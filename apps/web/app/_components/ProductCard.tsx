import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@onwei/core";
import type { ProductListItem } from "@onwei/core";

// The Figma card shows a star rating and review count ("(260)"). No reviews
// system exists yet in this codebase (see the "reviews" section below, which
// is static-only for the same reason), so this is decorative chrome, not
// real per-product data — it's rendered identically on every card.
function StaticRating() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Image
            key={index}
            src="/images/shared/star-outline.svg"
            alt=""
            width={10}
            height={10}
            aria-hidden
          />
        ))}
      </div>
      <span className="font-grotesk text-[10px] leading-[1.36] text-onwei-black">
        (260)
      </span>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const price = formatCurrency(product.priceRangeMinorUnits.min, "INR");

  return (
    <div className="flex w-full max-w-[282px] flex-col items-start gap-6">
      <div className="flex w-full flex-col items-start gap-3">
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
          <StaticRating />
          <div className="flex w-full items-center justify-between gap-2 font-display font-medium uppercase text-onwei-blue">
            <p
              className="min-w-0 flex-1 truncate text-[20px]"
              title={product.name}
            >
              {product.name}
            </p>
            <p className="shrink-0 text-[12px]">{price}</p>
          </div>
        </div>
      </div>
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
