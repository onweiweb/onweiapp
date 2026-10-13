import { TrackView } from "@/_components/TrackView";
import type { Metadata } from "next";
import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { findRedirect, sortProductList } from "@onwei/core";
import {
  cachedListActiveProductsByCategorySlug as listActiveProductsByCategorySlug,
  cachedListInstagramPhotos as listInstagramPhotos,
  cachedListSurfaceReviews as listSurfaceReviews,
} from "../../../lib/cachedCatalog";
import {
  buildCategoryMetadata,
  SHOP_ALL_METADATA,
} from "../../../lib/seo/metadata";
import { JsonLd } from "../../../lib/seo/jsonLd";
import { buildBreadcrumbJsonLd } from "../../../lib/seo/structuredData";
import type { CategorySummary, ProductListItem } from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductCard } from "@/_components/ProductCard";
import { PromoTile } from "@/_components/PromoTile";
import { SortDropdown } from "@/_components/SortDropdown";
import {
  CollectionSortProvider,
  SortedItems,
} from "@/_components/CollectionSort";
import { ReviewWall } from "@/_components/ReviewWall";
import { JoinMovementSection } from "@/_components/JoinMovementSection";
import { InstagramGrid } from "@/_components/InstagramGrid";
import { ScrollCarousel } from "@/_components/ScrollCarousel";
import { CtaLink } from "@/_components/CtaLink";

// Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame 760:3829 "Collection") mocks up
// one page that stacks a heading+grid block per category under a shared
// "shop all" banner and category tabs, there's no separate mockup for a
// single-category route. This reuses that same heading+grid block, scoped
// to either every category ("all") or one, rather than building a second
// layout that doesn't exist in the file.
//
// Below the grids, Figma repeats a "find your wei" mini CTA, a reviews
// wall, a full "Join the Movement" CTA, and an Instagram grid, each a
// page-specific variant (different heading/button copy, some with extra
// elements) of the same sections Homepage uses, not literal duplicates to
// skip. The reviews wall reuses Homepage's HOME_WALL surface rather than a
// new ReviewSurface value, since Figma shows the same curated content
// repeated per page and a new surface would need its own schema migration.
const CATEGORY_TABS = [
  { label: "Shop All", slug: "all" },
  { label: "Pickleball", slug: "pickleball" },
  { label: "Pilates", slug: "pilates" },
] as const;

// Lifestyle promo tile mixed into each category's grid (Figma nodes
// 760:3939/3940 for Pickleball, 760:3956/3963 for Pilates), position
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
  // 3 products + the promo tile is exactly what fits one row at desktop
  // width (Figma's own layout), no scroll affordance needed there. More
  // than that needs it, so only then does the row scroll.
  const needsScroll = products.length > 3;
  // Three orderings of the same cards, made here with core's sort so the
  // client only has to pick one (see CollectionSort.tsx).
  const orders = {
    featured: products.map((product) => product.id),
    "price-asc": sortProductList(products, "price-asc").map(
      (product) => product.id,
    ),
    "price-desc": sortProductList(products, "price-desc").map(
      (product) => product.id,
    ),
  };
  const productCards = (
    <SortedItems
      orders={orders}
      items={products.map((product) => ({
        id: product.id,
        node: <ProductCard product={product} eager={needsScroll} />,
      }))}
    />
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <h2 className="font-display text-[3rem] font-bold uppercase leading-[1.1] text-onwei-blue desk:text-[4rem]">
        {category.name}
      </h2>
      {needsScroll ? (
        // Only the product cards scroll, the promo tile is a sibling
        // outside ScrollCarousel's own overflow-x-auto box, not a child
        // of it, so it stays put instead of scrolling away with the
        // products (and its illustration overlay, which intentionally
        // hangs outside the tile's own box, never risks getting clipped
        // by the scroll container's overflow).
        <div className="flex w-full flex-col items-start gap-8 desk:flex-row">
          {promo?.side === "start" ? promo.tile : null}
          <ScrollCarousel
            gap="gap-8"
            className="items-start"
            wrapperClassName="w-full min-w-0 desk:w-auto desk:flex-1"
          >
            {productCards}
          </ScrollCarousel>
          {promo?.side === "end" ? promo.tile : null}
        </div>
      ) : (
        // Below desk the row (3 cards + promo) is wider than the screen, so it
        // scrolls sideways. The padding/negative margin pair gives the promo
        // illustration room to hang outside its tile without being clipped by
        // the scroll box, and cancels itself out in layout.
        <div className="no-scrollbar -mb-12 -mt-6 flex w-full items-start gap-8 overflow-x-auto pb-12 pr-6 pt-6 desk:m-0 desk:overflow-visible desk:p-0">
          {promo?.side === "start" ? promo.tile : null}
          {productCards}
          {promo?.side === "end" ? promo.tile : null}
        </div>
      )}
    </div>
  );
}

// Figma node 760:3981, a smaller CTA than JoinMovementSection (single-line
// heading, no illustration), unique to the Collection page.
function FindYourWeiSection() {
  return (
    <section className="flex flex-col items-start gap-6 bg-onwei-green px-6 py-14 desk:flex-row desk:items-center desk:justify-between desk:px-[7.5rem] desk:py-[4.5rem]">
      <p className="font-display text-[3rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-[4rem]">
        Find Your Wei
      </p>
      <div className="relative flex flex-col items-start gap-6">
        <p className="max-w-[30.25rem] font-grotesk text-body text-onwei-blue">
          Movement events, community sessions, early{" "}
          <br className="max-desk:hidden" />
          access, product testing, and exclusive rewards -{" "}
          <br className="max-desk:hidden" />
          and a say in what we build next!
        </p>
        <CtaLink href="#" className="bg-onwei-blue text-onwei-beige">
          Start Quiz
        </CtaLink>
        <Image
          src="/images/about2/underline.svg"
          alt=""
          width={285}
          height={2}
          aria-hidden
          className="pointer-events-none absolute -left-1 top-[3.25rem] w-[17.8125rem] max-w-none"
        />
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "all") return SHOP_ALL_METADATA;

  const result = await listActiveProductsByCategorySlug(slug);
  if (!result) return {};
  return buildCategoryMetadata(result.category);
}

// Built once and refreshed every minute (or on demand when staff edit the
// catalog), instead of rendering on every visit. Sorting happens in the
// browser, so there is no search param to make the page dynamic.
export const revalidate = 60;

export function generateStaticParams() {
  return CATEGORY_TABS.map((tab) => ({ slug: tab.slug }));
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const categorySections =
    slug === "all"
      ? (
          await Promise.all(
            CATEGORY_TABS.filter((tab) => tab.slug !== "all").map((tab) =>
              listActiveProductsByCategorySlug(tab.slug),
            ),
          )
        ).filter(
          (result): result is NonNullable<typeof result> => result !== null,
        )
      : await (async () => {
          const result = await listActiveProductsByCategorySlug(slug);
          if (!result) {
            const toPath = await findRedirect(`/collection/${slug}`);
            if (toPath) permanentRedirect(toPath);
            notFound();
          }
          return [result];
        })();

  const hasProducts = categorySections.some(
    (section) => section.products.length > 0,
  );

  const [wallReviews, instagramPhotos] = await Promise.all([
    listSurfaceReviews({ surface: "HOME_WALL" }),
    listInstagramPhotos(),
  ]);

  const breadcrumbName =
    slug === "all" ? "Shop All" : (categorySections[0]?.category.name ?? slug);

  return (
    <CollectionSortProvider>
      <main>
        <TrackView
          event="collection_viewed"
          props={{
            category_slug: slug,
            product_count: categorySections.reduce(
              (total, section) => total + section.products.length,
              0,
            ),
          }}
        />
        <JsonLd
          data={buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: breadcrumbName, path: `/collection/${slug}` },
          ])}
        />
        <SiteHeader nav="inner" />

        <section className="relative flex flex-col items-center bg-onwei-green px-6 pb-14 pt-[5.5rem] desk:px-14 desk:pb-14 desk:pt-8">
          {/* Desktop (node 760:3874): every illustration is absolute to the
            section, x measured from the centre line so it holds at any
            width, y from the top (px / 16). Mobile has no Figma frame, so
            it keeps a scaled adaptation. */}
          <Image
            src="/images/collection/illustration-weightlifter.svg"
            alt=""
            width={99}
            height={98}
            aria-hidden
            className="pointer-events-none absolute left-6 top-6 origin-top-left scale-75 desk:left-[calc(50%-26.125rem)] desk:top-[2.2106rem] desk:scale-100"
          />
          {/* Figma node 760:4191, straddles the boundary with the category
            nav below it, same overlap pattern as JoinMovementSection's
            illustration straddling above its section. */}
          <Image
            src="/images/collection/illustration-pilates-hero.svg"
            alt=""
            width={167}
            height={65}
            aria-hidden
            className="pointer-events-none absolute bottom-[-1.5rem] right-4 origin-bottom-right scale-75 desk:bottom-auto desk:left-[calc(50%+19.1875rem)] desk:right-auto desk:top-40 desk:origin-center desk:scale-100"
          />
          <Image
            src="/images/collection/squiggle-shop.svg"
            alt=""
            width={46}
            height={36}
            aria-hidden
            className="pointer-events-none absolute left-[calc(50%-11.5625rem)] top-[1.3356rem] hidden desk:block"
          />
          <Image
            src="/images/collection/arrow-curl.svg"
            alt=""
            width={86}
            height={55}
            aria-hidden
            className="pointer-events-none absolute left-[calc(50%+16.75rem)] top-[3.5856rem] hidden desk:block"
          />
          <div className="relative flex w-full max-w-[90rem] flex-col items-center gap-6 text-center desk:max-w-[39.9375rem]">
            <Image
              src="/images/collection/oval-all.svg"
              alt=""
              width={141}
              height={61}
              aria-hidden
              className="pointer-events-none absolute left-[20.7813rem] top-[0.4606rem] hidden desk:block"
            />
            <h1 className="relative inline-block font-display text-[3rem] font-bold uppercase leading-[1.1] text-onwei-blue desk:text-[4rem]">
              <Image
                src="/images/collection/squiggle-shop.svg"
                alt=""
                width={46}
                height={36}
                aria-hidden
                className="pointer-events-none absolute -left-12 top-0 origin-top-left scale-75 desk:hidden"
              />
              Shop all
              <Image
                src="/images/collection/arrow-curl.svg"
                alt=""
                width={86}
                height={55}
                aria-hidden
                className="pointer-events-none absolute -right-[4.5rem] top-2 origin-top-left scale-75 desk:hidden"
              />
            </h1>
            <p className="max-w-[30.25rem] font-grotesk text-body text-onwei-blue">
              Shop our range of goods for pickleball or pilates and be a part of
              our community!
            </p>
          </div>
        </section>

        <nav
          aria-label="Category"
          className="flex w-full flex-wrap items-center justify-between gap-4 bg-onwei-white px-6 py-6 desk:items-start desk:gap-8 desk:px-14 desk:pb-6 desk:pt-12"
        >
          <div className="flex flex-wrap items-center gap-4 desk:gap-8">
            <p className="whitespace-nowrap font-grotesk text-body uppercase text-onwei-blue">
              Categories:
            </p>
            {CATEGORY_TABS.map((tab) => (
              <Link
                key={tab.slug}
                href={`/collection/${tab.slug}`}
                className={`relative whitespace-nowrap font-display text-[1.25rem] uppercase text-onwei-blue ${
                  tab.slug === slug ? "font-medium" : "font-normal"
                }`}
              >
                {/* Figma node 760:4210, a hand-drawn oval circling the
                  active tab. Figma only mocks this for "Shop All" (sized
                  to its text width); Pickleball/Pilates have no matching
                  asset to circle themselves with when active. */}
                {tab.slug === "all" && slug === "all" ? (
                  <Image
                    src="/images/collection/oval-shop-all.svg"
                    alt=""
                    width={122}
                    height={45}
                    aria-hidden
                    className="pointer-events-none absolute -left-4 -top-3"
                  />
                ) : null}
                <span className="relative">{tab.label}</span>
              </Link>
            ))}
          </div>
          <SortDropdown />
        </nav>

        <section className="flex flex-col items-center gap-16 bg-onwei-white px-6 pb-24 pt-12 desk:px-14 desk:pb-[7.5rem] desk:pt-0">
          <div className="flex w-full max-w-[90rem] flex-col gap-16 desk:gap-24">
            {!hasProducts ? (
              <p className="font-grotesk text-body text-onwei-blue">
                No products yet, check back soon.
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

        <section className="flex flex-col items-center bg-onwei-white px-6 pb-24 desk:px-14 desk:pb-[1.875rem] desk:pt-20">
          <div className="relative aspect-[1328/645] w-full max-w-[83rem] overflow-hidden rounded-[1.875rem]">
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

        <FindYourWeiSection />

        <ReviewWall
          reviews={wallReviews}
          heading={
            <>
              Chosen by 1000+
              <br />
              everyday movers
            </>
          }
          shareLabel="share your on wei routine and get rewarded"
        />

        <JoinMovementSection buttonLabel="Move With Onwei" />

        <InstagramGrid
          photos={instagramPhotos}
          heading="@onwei"
          headingClassName="desk:text-[4rem]"
          noteClassName="desk:left-[calc(50%-24.1875rem)] desk:top-[1.9588rem]"
          arrowClassName="desk:left-[calc(50%+9.66rem)] desk:top-[2.74rem]"
        />

        <SiteFooter />
      </main>
    </CollectionSortProvider>
  );
}
