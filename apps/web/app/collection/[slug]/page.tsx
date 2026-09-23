import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listActiveProductsByCategorySlug } from "@onwei/core";
import type {
  CategorySummary,
  ProductListItem,
  ProductSort,
} from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductCard } from "@/_components/ProductCard";
import { PromoTile } from "@/_components/PromoTile";
import { SortDropdown } from "@/_components/SortDropdown";

// Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame 760:3829 "Collection") mocks up
// one page that stacks a heading+grid block per category under a shared
// "shop all" banner and category tabs — there's no separate mockup for a
// single-category route. This reuses that same heading+grid block, scoped
// to either every category ("all") or one, rather than building a second
// layout that doesn't exist in the file. The reviews/newsletter/Instagram/
// footer sections further down that Figma page are the same content as the
// Homepage's and are intentionally not repeated here (see the Phase 1
// plan's Collection page scope).
const CATEGORY_TABS = [
  { label: "Shop All", slug: "all" },
  { label: "Pickleball", slug: "pickleball" },
  { label: "Pilates", slug: "pilates" },
] as const;

// Lifestyle promo tile mixed into each category's grid (Figma nodes
// 760:3939/3940 for Pickleball, 760:3956/3963 for Pilates) — position
// (which side of the grid) and the overlay illustration's placement differ
// per category, not just the photo.
const PROMO_BY_CATEGORY: Record<
  string,
  { side: "start" | "end"; tile: React.ReactNode }
> = {
  pickleball: {
    side: "end",
    tile: (
      <PromoTile
        photo="/images/collection/promo-pickleball.png"
        photoAlt="Athlete mid-swing with a Recess pickleball paddle"
        illustration="/images/collection/illustration-runner.svg"
        illustrationWidth={145}
        illustrationHeight={212}
        illustrationClassName="-bottom-12 -right-6 z-10"
      />
    ),
  },
  pilates: {
    side: "start",
    tile: (
      <PromoTile
        photo="/images/collection/promo-pilates.png"
        photoAlt="Athlete in a Pilates pose"
        illustration="/images/collection/illustration-pilates.svg"
        illustrationWidth={183}
        illustrationHeight={99}
        illustrationClassName="-top-6 left-14 z-10"
      />
    ),
  },
};

function CategorySection({
  category,
  products,
}: {
  category: CategorySummary;
  products: ProductListItem[];
}) {
  if (products.length === 0) return null;
  const promo = PROMO_BY_CATEGORY[category.slug];

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="font-display text-[48px] font-bold uppercase leading-[1.1] text-onwei-blue lg:text-[64px]">
        {category.name}
      </p>
      <div className="no-scrollbar flex w-full items-start gap-8 overflow-x-auto">
        {promo?.side === "start" ? promo.tile : null}
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {promo?.side === "end" ? promo.tile : null}
      </div>
    </div>
  );
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: ProductSort =
    sortParam === "price-asc" || sortParam === "price-desc"
      ? sortParam
      : "featured";

  const categorySections =
    slug === "all"
      ? (
          await Promise.all(
            CATEGORY_TABS.filter((tab) => tab.slug !== "all").map((tab) =>
              listActiveProductsByCategorySlug(tab.slug, sort),
            ),
          )
        ).filter(
          (result): result is NonNullable<typeof result> => result !== null,
        )
      : await (async () => {
          const result = await listActiveProductsByCategorySlug(slug, sort);
          if (!result) notFound();
          return [result];
        })();

  const hasProducts = categorySections.some(
    (section) => section.products.length > 0,
  );

  return (
    <main>
      <SiteHeader />

      <section className="relative flex flex-col items-center bg-onwei-green px-6 pb-14 pt-8 sm:px-14">
        <Image
          src="/images/collection/illustration-weightlifter.svg"
          alt=""
          width={99}
          height={98}
          aria-hidden
          className="pointer-events-none absolute left-[21%] top-8 hidden lg:block"
        />
        <div className="relative flex w-full max-w-[1440px] flex-col items-center gap-6 text-center">
          <p className="relative inline-block font-display text-[48px] font-bold uppercase leading-[1.1] text-onwei-blue lg:text-[64px]">
            <Image
              src="/images/collection/squiggle-shop.svg"
              alt=""
              width={46}
              height={36}
              aria-hidden
              className="pointer-events-none absolute -left-12 top-0 hidden lg:block"
            />
            Shop{" "}
            <span className="relative inline-block">
              <Image
                src="/images/collection/oval-all.svg"
                alt=""
                width={141}
                height={61}
                aria-hidden
                className="pointer-events-none absolute -left-3 -top-2 hidden lg:block"
              />
              <span className="relative">all</span>
            </span>
            <Image
              src="/images/collection/arrow-curl.svg"
              alt=""
              width={86}
              height={55}
              aria-hidden
              className="pointer-events-none absolute -right-24 top-2 hidden lg:block"
            />
          </p>
          <p className="max-w-[484px] font-grotesk text-[14px] text-onwei-blue">
            Shop our range of goods for pickleball or pilates and be a part of
            our community!
          </p>
        </div>
      </section>

      <nav
        aria-label="Category"
        className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-onwei-blue/10 bg-onwei-white px-6 py-6 sm:gap-8 sm:px-14"
      >
        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
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
        </div>
        <SortDropdown value={sort} />
      </nav>

      <section className="flex flex-col items-center gap-16 bg-onwei-white px-6 pb-24 pt-12 sm:px-14">
        <div className="flex w-full max-w-[1440px] flex-col gap-16">
          {!hasProducts ? (
            <p className="font-grotesk text-[14px] text-onwei-blue">
              No products yet — check back soon.
            </p>
          ) : (
            categorySections.map((section) => (
              <CategorySection
                key={section.category.slug}
                category={section.category}
                products={section.products}
              />
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col items-center bg-onwei-white px-6 pb-24 sm:px-14">
        <div className="relative aspect-[1328/645] w-full max-w-[1328px] overflow-hidden rounded-[30px]">
          <Image
            src="/images/collection/video-poster.png"
            alt="Athlete in motion on court"
            fill
            sizes="(min-width: 1328px) 1328px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/images/showcase/play-pause.svg"
              alt="Play video"
              width={98}
              height={114}
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
