import type { ProductListItem } from "@onwei/core";
import { ProductCard } from "./ProductCard";

// Figma PDP (frame "PDP_draft 2", node 759:3267 "you may also like") shows
// a 4-up product grid reusing the same product card component as the
// Homepage/Collection shop grid — backed here by `listRelatedProducts`
// (same category, excludes the current product) instead of a static list.
export function RelatedProducts({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-14 sm:px-6 lg:px-14">
      <div className="flex w-full max-w-[1440px] flex-col items-center gap-8">
        <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
          you may also like
        </p>
        <div className="no-scrollbar flex w-full items-start gap-8 overflow-x-auto lg:flex-wrap lg:justify-center">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
