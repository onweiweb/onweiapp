import type { Metadata } from "next";
import Image from "@/_components/ScaledImage";
import Link from "next/link";
import {
  cachedListActiveCategories as listActiveCategories,
  cachedListActiveProductsByCategorySlug as listActiveProductsByCategorySlug,
  cachedListInstagramPhotos as listInstagramPhotos,
  cachedListMarqueeItems as listMarqueeItems,
  cachedListPublishedArticles as listPublishedArticles,
  cachedListSurfaceReviews as listSurfaceReviews,
  cachedListValueProps as listValueProps,
} from "../lib/cachedCatalog";
import type {
  ArticleListItem,
  ProductListItem,
  ReviewListItem,
  ValuePropItem,
} from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductCard } from "@/_components/ProductCard";
import { CategoryTile } from "@/_components/CategoryTile";
import { MarqueeBar } from "@/_components/MarqueeBar";
import { ValueProps } from "@/_components/ValueProps";
import { InstagramGrid } from "@/_components/InstagramGrid";
import { ReviewWall } from "@/_components/ReviewWall";
import { JoinMovementSection } from "@/_components/JoinMovementSection";
import { ScrollCarousel } from "@/_components/ScrollCarousel";
import { StarRow } from "@/_components/StarRow";
import { CtaLink } from "@/_components/CtaLink";

function HeroSection({ marqueeItems }: { marqueeItems: string[] }) {
  return (
    // bg-onwei-green: best-effort match, not confirmed against Figma,
    // the section previously had no background at all (rendered white).
    // Figma's API is rate-limited right now; re-verify the exact fill once
    // access resets.
    <section className="flex flex-col items-center gap-3 bg-onwei-green pb-14 desk:gap-6">
      <div className="flex w-full max-w-[90rem] flex-col gap-3 px-3 desk:gap-6 desk:px-11 desk:flex-row">
        {/* Mobile frame (node 761:4804): 366x475 tile. The script line, arrow
            and underline are absolutely placed from that frame's own
            coordinates (left as % of tile width, top in rem, so they track the
            fluid root unit); from desk up they flow inline as in the desktop
            frame. */}
        <div className="relative flex h-[29.6875rem] w-full flex-col justify-end gap-[1.125rem] overflow-hidden rounded-[1.25rem] px-6 py-24 desk:h-[39.6875rem] desk:gap-8 desk:rounded-[1.875rem] desk:px-14">
          <Image
            src="/images/hero/pickleball-bg.png"
            alt="Woman sitting on a pickleball court holding a paddle"
            fill
            priority
            sizes="((min-width: 768px)) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative flex flex-col gap-[1.125rem] desk:gap-8">
            <h1 className="font-display text-[2.75rem] font-bold uppercase leading-[0.9] text-onwei-beige desk:text-display-xl">
              Made for <br className="desk:hidden" />
              everyday play
            </h1>
            <CtaLink
              href="/collection/pickleball"
              className="w-fit bg-onwei-beige text-onwei-blue"
            >
              shop pickleball
            </CtaLink>
            <span className="hidden items-center gap-2 desk:flex">
              <p className="font-script text-script-md uppercase text-onwei-beige">
                Serve. Rally. Repeat.
              </p>
              <Image
                src="/images/hero/arrow-1.svg"
                alt=""
                width={22}
                height={48}
                aria-hidden
                className="-rotate-[75deg]"
              />
            </span>
          </div>
          <p
            aria-hidden
            className="absolute left-[55.5%] top-[13.279rem] whitespace-nowrap font-script text-[1rem] uppercase leading-none text-onwei-beige desk:hidden"
          >
            Serve. Rally. Repeat.
          </p>
          <Image
            src="/images/hero/arrow-1.svg"
            alt=""
            width={20}
            height={43}
            aria-hidden
            className="absolute left-[70.3%] top-[14.956rem] h-[2.7119rem] w-[1.2429rem] -rotate-[165deg] desk:hidden"
          />
          <Image
            src="/images/hero/underline-1.svg"
            alt=""
            width={109}
            height={5}
            aria-hidden
            className="absolute left-[65%] top-[20.841rem] h-[0.3125rem] w-[6.8125rem] desk:hidden"
          />
        </div>

        {/* Mobile frame (node 761:4814), same treatment: badge stamp top
            right, underline under "own way", arrow and script bottom right. */}
        <div className="relative flex h-[29.6875rem] w-full flex-col justify-end gap-6 overflow-hidden rounded-[1.25rem] px-6 py-24 desk:h-[39.6875rem] desk:gap-8 desk:rounded-[1.875rem] desk:px-14">
          <Image
            src="/images/hero/pilates-bg.png"
            alt="Rolled yoga mat with an Onwei stamp"
            fill
            sizes="((min-width: 768px)) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <Image
            src="/images/hero/badge-stamp.svg"
            alt=""
            width={70}
            height={70}
            aria-hidden
            className="absolute right-[8.06%] top-[5.78%] h-[3.4125rem] w-[3.6563rem] desk:right-6 desk:top-6 desk:h-[4.375rem] desk:w-[4.375rem]"
          />
          <div className="relative flex flex-col gap-6 desk:gap-8">
            <h2 className="font-display text-[2.75rem] font-bold uppercase leading-[0.9] text-onwei-beige desk:text-display-xl">
              Movement,
              <br />
              your <br className="desk:hidden" />
              own way
            </h2>
            <CtaLink
              href="/collection/pilates"
              className="w-fit bg-onwei-beige text-onwei-blue"
            >
              shop pilates
            </CtaLink>
            <div className="hidden flex-col items-start gap-1 desk:flex">
              <span className="flex items-center gap-2">
                <p className="font-script text-script-md uppercase text-onwei-beige">
                  Not perfect, just consistent
                </p>
                <Image
                  src="/images/hero/arrow-2.svg"
                  alt=""
                  width={22}
                  height={48}
                  aria-hidden
                  className="-rotate-[38deg]"
                />
              </span>
              <Image
                src="/images/hero/underline-1.svg"
                alt=""
                width={344}
                height={5}
                aria-hidden
                className="max-w-[17.5rem]"
              />
            </div>
          </div>
          <p
            aria-hidden
            className="absolute left-[53%] top-[23.716rem] whitespace-pre font-script text-[1.25rem] uppercase leading-none text-onwei-beige desk:hidden"
          >
            {"Not perfect, \njust consistent"}
          </p>
          <Image
            src="/images/hero/arrow-2.svg"
            alt=""
            width={20}
            height={43}
            aria-hidden
            className="absolute left-[60.3%] top-[20.299rem] h-[2.7119rem] w-[1.2429rem] -rotate-[57.52deg] desk:hidden"
          />
          <Image
            src="/images/hero/underline-1.svg"
            alt=""
            width={201}
            height={5}
            aria-hidden
            className="absolute left-[1.6875rem] top-[20.404rem] h-[0.3125rem] w-[12.5625rem] desk:hidden"
          />
        </div>
      </div>

      <div className="w-full max-w-[85rem] px-3 desk:px-11">
        <MarqueeBar items={marqueeItems} />
      </div>
    </section>
  );
}

function ShowcaseSection({
  marqueeItems,
  valueProps,
}: {
  marqueeItems: string[];
  valueProps: ValuePropItem[];
}) {
  return (
    <section className="flex flex-col items-center bg-onwei-green px-3 py-14 desk:px-14">
      <div className="flex w-full max-w-[90rem] flex-col gap-12">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
            Designed to Move.
          </p>
          <span className="flex items-center gap-2 font-script text-script-md uppercase text-onwei-blue">
            <Image
              src="/images/showcase/arrow-rotate.svg"
              alt=""
              width={22}
              height={48}
              aria-hidden
              className="h-[1.375rem] w-[0.625rem] -rotate-90"
            />
            at your pace
          </span>
        </div>

        <div className="flex flex-col gap-6 desk:flex-row">
          <div className="relative h-[26.25rem] w-full overflow-hidden rounded-[1.875rem] desk:h-[40.375rem] desk:w-[51.5rem]">
            <Image
              src="/images/showcase/video-poster.png"
              alt="Rolled yoga mat, paused video preview"
              fill
              sizes="((min-width: 768px)) 58vw, 100vw"
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

          <div className="flex flex-1 flex-col gap-6">
            <ValueProps items={valueProps} />
          </div>
        </div>

        <MarqueeBar items={marqueeItems} />
      </div>
    </section>
  );
}

function ShopSection({
  pickleballHref,
  pilatesHref,
}: {
  pickleballHref: string;
  pilatesHref: string;
}) {
  return (
    <section className="flex items-end justify-center bg-onwei-white px-3 pb-0 pt-12 desk:px-14 desk:pb-12 desk:pt-16">
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-8">
        <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-display-md">
          shop our gear
        </p>
        <div className="flex items-start gap-8">
          <CategoryTile
            label="pickle ball"
            mobileLabel="pickleball"
            href={pickleballHref}
            circled
          />
          <CategoryTile label="pilates" href={pilatesHref} />
        </div>
      </div>
    </section>
  );
}

function TestimonialTile({ review }: { review: ReviewListItem | undefined }) {
  if (!review) return null;
  return (
    <div className="relative flex h-[26.25rem] w-full max-w-[23.4375rem] shrink-0 flex-col items-center justify-center gap-8 overflow-hidden rounded-[1.875rem] p-8 max-desk:hidden">
      <Image
        src="/images/product-grid/testimonial-bg.png"
        alt=""
        fill
        sizes="375px"
        className="object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex flex-col items-center gap-8 text-center text-onwei-beige">
        <StarRow count={review.rating} />
        {review.title ? (
          <p className="font-grotesk text-[length:max(0.875rem,11px)] font-bold">
            {review.title}
          </p>
        ) : null}
        <p className="font-grotesk text-[length:max(0.875rem,11px)]">
          {review.body}
        </p>
      </div>
      <Image
        src="/images/product-grid/carousel-dots.svg"
        alt=""
        width={68}
        height={10}
        aria-hidden
        className="relative"
      />
    </div>
  );
}

function ProductGridSection({
  products,
  testimonial,
}: {
  products: ProductListItem[];
  testimonial: ReviewListItem | undefined;
}) {
  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 pb-24 desk:px-14">
      {/* Mobile (node 761:4877 "Shop"): a horizontal-scroll carousel, not a
          wrapping grid, matches the same pattern as Reviews/Instagram. At
          desk:+ it reverts to the desktop row, which already fits everything
          on one line at 1440px so the scroll track is hidden there. */}
      <ScrollCarousel
        gap="gap-8"
        className="max-w-[90rem] items-start desk:flex-wrap desk:justify-center"
        trackClassName="desk:hidden"
      >
        <TestimonialTile review={testimonial} />
        {products.map((product) => (
          <ProductCard key={product.id} product={product} eager />
        ))}
      </ScrollCarousel>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="flex flex-col items-center bg-onwei-purple px-3 py-14 desk:px-14">
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-8 desk:flex-row desk:items-end desk:justify-between">
        <div className="flex w-full max-w-[39.9375rem] flex-col items-center gap-7 text-center desk:items-stretch desk:gap-8 desk:text-left">
          <p className="font-display text-[2.25rem] font-bold uppercase leading-[1.1] text-onwei-white desk:text-[4rem]">
            Built to{" "}
            <span className="relative inline-block">
              <Image
                src="/images/about/circle-move.svg"
                alt=""
                width={199}
                height={74}
                aria-hidden
                className="pointer-events-none absolute -left-[15%] -top-[45%] -z-0 hidden w-[130%] max-w-none desk:block"
              />
              {/* Mobile frame (node 761:4858) underlines "move" instead of
                  circling it. */}
              <Image
                src="/images/about/underline-move-mobile.svg"
                alt=""
                width={89}
                height={3}
                aria-hidden
                className="pointer-events-none absolute -bottom-1 left-0 h-[3%] w-full desk:hidden"
              />
              <span className="relative">move</span>
            </span>
            ,
            <br />
            Built with{" "}
            <span className="relative inline-block">
              <span className="relative">intent</span>
              <Image
                src="/images/about/underline-1.svg"
                alt=""
                width={213}
                height={7}
                aria-hidden
                className="pointer-events-none absolute -bottom-1 left-0 h-[6%] w-full"
              />
            </span>
            ,
            <br />
            Built by an{" "}
            <span className="relative inline-block">
              <span className="relative">athlete</span>
              <Image
                src="/images/about/underline-2.svg"
                alt=""
                width={248}
                height={7}
                aria-hidden
                className="pointer-events-none absolute -bottom-1 left-0 h-[6%] w-full"
              />
            </span>
            .
          </p>
          <div className="flex w-full max-w-[20.3125rem] flex-col gap-6 desk:max-w-none">
            <p className="max-w-[30.25rem] font-grotesk text-[length:max(0.875rem,11px)] text-onwei-white">
              Serious doesn&apos;t just mean intense. It means you show up,
              three times a week, every week, whether or not anyone&apos;s
              watching.
              <br />
              <br />
              Because underneath it all, its about joy. The kind that comes from
              moving.
              <br />
              <br />
              Onwei is for people who don&apos;t live in one lane, people
              constantly in motion between work, wellness, play, and everything
              else.
              <br />
              <br />
              We didn&apos;t build this in a boardroom. We built it the way we
              live, on courts, on mats, showing up for ourselves first.
            </p>
            <CtaLink
              href="/about"
              className="w-full bg-onwei-beige text-onwei-blue desk:w-fit"
            >
              our story
            </CtaLink>
          </div>
        </div>
        <div className="relative h-[25rem] w-full max-w-[37.5rem] desk:h-[32.375rem]">
          <Image
            src="/images/about/photo.png"
            alt="Blurred motion shot of an athlete moving on court"
            fill
            sizes="((min-width: 768px)) 42vw, 100vw"
            className="rounded-[1.25rem] object-cover desk:rounded-[1.875rem]"
          />
          {/* Mobile frame (node 761:4864): runner overlapping the photo's
              top right corner. */}
          <Image
            src="/images/about/runner-mobile.svg"
            alt=""
            width={113}
            height={203}
            aria-hidden
            className="pointer-events-none absolute -top-3 right-0 h-[12.6875rem] w-[7.0625rem] desk:hidden"
          />
        </div>
      </div>
    </section>
  );
}

// Static, no blog/article model exists in this codebase (see
// docs/DATABASE_SCHEMA.md). All three posts, dates and body copy are
// hardcoded straight from the Figma file.
// Was 100% hardcoded lorem-ipsum placeholder with href="#" dead links (see
// docs/OPEN_DECISIONS.md's SEO entry), now backed by the real Article
// model. No real /journal index page exists yet (out of this pass's scope,
// only /journal/[slug] detail pages), so "explore blogs" points at the
// most recent article rather than a listing that doesn't exist.
function JournalSection({ articles }: { articles: ArticleListItem[] }) {
  const [mostRecent] = articles;
  if (!mostRecent) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-24 desk:px-14">
      <div className="flex w-full max-w-[90rem] flex-col gap-12">
        <div className="flex w-full flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
              from the playbook
            </p>
            <Image
              src="/images/journal/underline.svg"
              alt=""
              width={321}
              height={6}
              aria-hidden
              className="max-w-full"
            />
          </div>
          <CtaLink
            href={`/journal/${mostRecent.slug}`}
            className="bg-onwei-blue text-onwei-beige"
          >
            explore blogs
          </CtaLink>
        </div>

        {/* Mobile (node 761:5154): horizontal-scroll carousel of fixed-
            width cards, matching Shop/Reviews/Instagram. At desk:+ this
            reverts to an even 3-column row (flex-1, no fixed width). */}
        <ScrollCarousel
          gap="gap-6"
          className="desk:overflow-visible"
          trackClassName="desk:hidden"
        >
          {articles.map((post) => (
            <article
              key={post.slug}
              className="flex w-[18.75rem] shrink-0 flex-col gap-3 desk:w-auto desk:flex-1 desk:shrink"
            >
              <div className="relative aspect-[416/280] w-full overflow-hidden rounded-[1.25rem] bg-[#d4d4d4]">
                {post.coverImageUrl ? (
                  <Image
                    src={post.coverImageUrl}
                    alt=""
                    fill
                    sizes="((min-width: 768px)) 33vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-6 text-onwei-blue">
                <div className="flex flex-col gap-2">
                  {post.publishedAt ? (
                    <p className="font-grotesk text-[length:max(0.6875rem,11px)] font-light">
                      {post.publishedAt.toLocaleDateString()}
                    </p>
                  ) : null}
                  <p className="font-display text-[length:max(1.125rem,11px)] font-medium uppercase tracking-[0.0135rem]">
                    {post.title}
                  </p>
                  {post.excerpt ? (
                    <p className="font-grotesk text-[length:max(0.875rem,11px)]">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/journal/${post.slug}`}
                  className="text-[length:max(1rem,11px)] underline capitalize"
                >
                  Read More
                </Link>
              </div>
            </article>
          ))}
        </ScrollCarousel>
      </div>
    </section>
  );
}

export const metadata: Metadata = {
  title: "Home",
  description:
    "Sports and Fitness accessories for everyday movers, from Onwei.",
  alternates: { canonical: "/" },
};

// No live Instagram feed integration exists, photos are CMS-editable
// (InstagramPhoto) rather than a real feed, but no longer hardcoded here.
export default async function HomePage() {
  const [
    categories,
    pickleballCollection,
    heroTestimonial,
    wallReviews,
    heroMarqueeItems,
    showcaseMarqueeItems,
    valueProps,
    instagramPhotos,
    articles,
  ] = await Promise.all([
    listActiveCategories(),
    listActiveProductsByCategorySlug("pickleball"),
    listSurfaceReviews({ surface: "HOME_HERO" }),
    listSurfaceReviews({ surface: "HOME_WALL" }),
    listMarqueeItems("HOME_HERO"),
    listMarqueeItems("HOME_SHOWCASE"),
    listValueProps(),
    listInstagramPhotos(),
    listPublishedArticles(3),
  ]);
  const pickleball = categories.find(
    (category) => category.slug === "pickleball",
  );
  const pilates = categories.find((category) => category.slug === "pilates");
  // ShopSection's "pickle ball" tile is always the one shown as selected
  // (Figma's Homepage frame only specifies this one state, no interactive
  // toggle), so the grid below it shows pickleball products to match,
  // showing unrelated products under a circled "pickle ball" tab was the
  // bug reported against the live site.
  const products = (pickleballCollection?.products ?? []).slice(0, 3);

  return (
    <main>
      <SiteHeader />
      <HeroSection marqueeItems={heroMarqueeItems} />
      <ShowcaseSection
        marqueeItems={showcaseMarqueeItems}
        valueProps={valueProps}
      />
      <ShopSection
        pickleballHref={
          pickleball
            ? `/collection/${pickleball.slug}`
            : "/collection/pickleball"
        }
        pilatesHref={
          pilates ? `/collection/${pilates.slug}` : "/collection/pilates"
        }
      />
      <ProductGridSection
        products={products}
        testimonial={heroTestimonial[0]}
      />
      <AboutSection />
      <ReviewWall
        reviews={wallReviews}
        heading={
          <>
            Chosen by 1000+
            <br />
            everyday movers
          </>
        }
      />
      <JoinMovementSection />
      <JournalSection articles={articles} />
      <InstagramGrid photos={instagramPhotos} />
      <SiteFooter />
    </main>
  );
}
