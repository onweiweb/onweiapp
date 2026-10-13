import type { ProductListItem } from "@onwei/core";
import { ProductCard } from "./ProductCard";

// Figma PDP (frame "PDP_draft 2", node 759:3267 "you may also like") shows
// a 4-up product grid reusing the same product card component as the
// Homepage/Collection shop grid, backed here by `listRelatedProducts`
// (same category, excludes the current product) instead of a static list.
// Heading 72px under the previous band, cards spread edge to edge, 96px
// below.
export function RelatedProducts({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 pb-24 pt-14 desk:px-14 desk:pt-[4.5rem]">
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-12">
        <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-display-md">
          you may also like
        </p>
        <div className="no-scrollbar flex w-full items-start gap-8 overflow-x-auto desk:justify-between desk:overflow-visible">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
