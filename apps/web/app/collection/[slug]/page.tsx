import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listActiveProductsByCategorySlug,
  listAllActiveProducts,
} from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductCard } from "@/_components/ProductCard";

// Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame 760:3829 "Collection") mocks up
// one page that stacks a heading+grid block per category under a shared
// "shop all" banner and category tabs — there's no separate mockup for a
// single-category route. This reuses that same heading+grid block, scoped
// to either every product ("all") or one category, rather than building a
// second layout that doesn't exist in the file. The reviews/newsletter/
// Instagram/footer sections further down that Figma page are the same
// content as the Homepage's and are intentionally not repeated here (see
// the Phase 1 plan's Collection page scope).
const CATEGORY_TABS = [
  { label: "Shop All", slug: "all" },
  { label: "Pickleball", slug: "pickleball" },
  { label: "Pilates", slug: "pilates" },
] as const;

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const heading = slug === "all" ? null : slug;
  const products =
    slug === "all"
      ? await listAllActiveProducts()
      : await (async () => {
          const result = await listActiveProductsByCategorySlug(slug);
          if (!result) notFound();
          return result;
        })();

  const productList = Array.isArray(products) ? products : products.products;
  const categoryName = Array.isArray(products) ? null : products.category.name;

  return (
    <main>
      <SiteHeader />

      <section className="flex flex-col items-center bg-onwei-green px-6 pb-14 pt-8 sm:px-14">
        <div className="flex w-full max-w-[1440px] flex-col items-center gap-6 text-center">
          <p className="font-display text-[48px] font-bold uppercase leading-[1.1] text-onwei-blue lg:text-[64px]">
            shop all
          </p>
          <p className="max-w-[484px] font-grotesk text-[14px] text-onwei-blue">
            Shop our range of goods for pickleball or pilates and be a part of
            our community!
          </p>
        </div>
      </section>

      <nav
        aria-label="Category"
        className="flex w-full flex-wrap items-center gap-4 border-b border-onwei-blue/10 bg-onwei-white px-6 py-6 sm:gap-8 sm:px-14"
      >
        <p className="whitespace-nowrap font-grotesk text-[14px] uppercase text-onwei-blue">
          Categories:
        </p>
        {CATEGORY_TABS.map((tab) => (
          <Link
            key={tab.slug}
            href={`/collection/${tab.slug}`}
            className={`whitespace-nowrap font-display text-[20px] uppercase text-onwei-blue ${
              tab.slug === slug ? "font-medium" : "font-normal"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <section className="flex flex-col items-center bg-onwei-white px-6 pb-24 pt-12 sm:px-14">
        <div className="flex w-full max-w-[1440px] flex-col gap-8">
          {heading ? (
            <p className="font-display text-[48px] font-bold uppercase leading-[1.1] text-onwei-blue lg:text-[64px]">
              {categoryName ?? heading}
            </p>
          ) : null}
          {productList.length === 0 ? (
            <p className="font-grotesk text-[14px] text-onwei-blue">
              No products yet — check back soon.
            </p>
          ) : (
            <div className="flex flex-wrap items-start gap-8">
              {productList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
