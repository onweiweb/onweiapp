import type { Metadata } from "next";
import Image from "@/_components/ScaledImage";
import {
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
import { ShopTabs, type ShopTab } from "@/_components/ShopTabs";
import { MarqueeBar } from "@/_components/MarqueeBar";
import { ValueProps } from "@/_components/ValueProps";
import { InstagramGrid } from "@/_components/InstagramGrid";
import { ReviewWall } from "@/_components/ReviewWall";
import { JoinMovementSection } from "@/_components/JoinMovementSection";
import { ScrollCarousel } from "@/_components/ScrollCarousel";
import { TrackedLink } from "@/_components/TrackedLink";
import { StarRow } from "@/_components/StarRow";
import { CtaLink } from "@/_components/CtaLink";
import { formatArticleDate } from "../lib/formatDate";

function HeroSection({ marqueeItems }: { marqueeItems: string[] }) {
  return (
    // bg-onwei-green: best-effort match, not confirmed against Figma,
    // the section previously had no background at all (rendered white).
    // Figma's API is rate-limited right now; re-verify the exact fill once
    // access resets.
    <section className="flex flex-col items-center gap-3 bg-onwei-green pb-3 desk:gap-6 desk:pb-14">
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
            className="object-cover desk:!top-[-13.72%] desk:!h-[173.8%]"
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
          </div>
          {/* Desktop (node 758:2265): script note, arrow and underline are
              absolute in the card, coordinates from Figma (x, y in px / 16). */}
          <p className="absolute left-[26.1875rem] top-[19.1925rem] hidden whitespace-nowrap font-script text-script-md uppercase leading-none text-onwei-beige desk:block">
            Serve. Rally. Repeat.
          </p>
          <Image
            src="/images/hero/arrow-1.svg"
            alt=""
            width={22}
            height={48}
            aria-hidden
            className="absolute left-[29.24rem] top-[20.882rem] hidden -rotate-[165deg] desk:block"
          />
          <Image
            src="/images/hero/underline-3.svg"
            alt=""
            width={185}
            height={7}
            aria-hidden
            className="absolute left-[26.5rem] top-[29.5675rem] hidden desk:block"
          />
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
            className="absolute right-[8.06%] top-[5.78%] h-[3.4125rem] w-[3.6563rem] desk:bottom-[81.59%] desk:left-[81.35%] desk:right-[6.92%] desk:top-[6.94%] desk:h-auto desk:w-auto"
          />
          <div className="relative flex flex-col gap-6 desk:gap-8">
            <h2 className="font-display text-[2.75rem] font-bold uppercase leading-[0.9] text-onwei-beige desk:whitespace-nowrap desk:text-display-xl">
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
          </div>
          <p className="absolute left-[18.75rem] top-[33.6925rem] hidden whitespace-nowrap font-script text-script-md uppercase leading-none text-onwei-beige desk:block">
            Not perfect, just consistent
          </p>
          <Image
            src="/images/hero/arrow-2.svg"
            alt=""
            width={22}
            height={48}
            aria-hidden
            className="absolute left-[24.522rem] top-[29.738rem] hidden -rotate-[37.56deg] desk:block"
          />
          <Image
            src="/images/hero/underline-1.svg"
            alt=""
            width={344}
            height={5}
            aria-hidden
            className="absolute left-[16.9375rem] top-[29.1925rem] hidden desk:block"
          />
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

      <div className="w-full max-w-[85rem] px-3 desk:px-0">
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
    <section className="flex flex-col items-center bg-onwei-green px-3 pb-3 pt-14 desk:px-14 desk:pb-20 desk:pt-0">
      <div className="flex w-full max-w-[90rem] flex-col gap-12">
        {/* Desktop (node 758:2309): the arrow and "at your pace" are
            absolute beside the heading (x 597 and 656 from its left), mobile
            keeps them inline. */}
        <div className="relative flex flex-wrap items-center gap-3 max-desk:hidden">
          <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
            Designed to Move.
          </p>
          <Image
            src="/images/showcase/arrow-rotate.svg"
            alt=""
            width={22}
            height={48}
            aria-hidden
            className="absolute left-[37.34rem] top-[-0.789rem] hidden -rotate-90 desk:block"
          />
          <span className="absolute left-[41.03rem] top-[0.46rem] hidden whitespace-nowrap font-script text-script-md uppercase leading-none text-onwei-blue desk:block">
            at your pace
          </span>
        </div>

        <div className="flex flex-col gap-6 desk:flex-row desk:gap-12">
          {/* The video column is as tall as the card stack and the video
              sticks inside it while the cards scroll past (Figma 758:2313). */}
          <div className="desk:w-[51.5rem] desk:shrink-0">
            <div className="relative h-[26.25rem] w-full overflow-hidden rounded-[1.875rem] desk:sticky desk:top-32 desk:h-[40.375rem]">
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
                  className="h-[4.4375rem] w-[3.8125rem] desk:h-[7.125rem] desk:w-[6.125rem]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <ValueProps items={valueProps} stacked />
          </div>
        </div>

        <div className="max-desk:hidden">
          <MarqueeBar items={marqueeItems} />
        </div>
      </div>
    </section>
  );
}

function TestimonialTile({
  review,
  image,
  crop = false,
}: {
  review: ReviewListItem | undefined;
  image: string;
  // The pickleball photo is a pre-cropped export placed with offsets
  // (Figma 758:2329), the yoga one fills the tile (758:2637).
  crop?: boolean;
}) {
  if (!review) return null;
  return (
    <div className="relative flex h-[26.25rem] w-full max-w-[23.4375rem] shrink-0 flex-col items-center justify-center gap-8 overflow-hidden rounded-[1.875rem] p-8 max-desk:hidden desk:h-[31.125rem] desk:gap-14">
      <Image
        src={image}
        alt=""
        fill
        sizes="375px"
        className={
          crop
            ? "object-cover desk:max-w-none desk:!left-[-12.86%] desk:!top-[-35.53%] desk:!h-[142%] desk:!w-[125.72%]"
            : "object-cover"
        }
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex flex-col items-center gap-8 text-center text-onwei-beige">
        <StarRow count={review.rating} />
        {review.title ? (
          <p className="font-grotesk text-body font-bold">{review.title}</p>
        ) : null}
        <p className="max-w-[17.0625rem] font-grotesk text-body">
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

// One tab's worth of the shop row: the review tile then the product cards.
// The tile photo differs per tab (Figma 758:2329 vs 758:2637).
function ShopPanel({
  products,
  testimonial,
  tileImage,
  cropTile = false,
}: {
  products: ProductListItem[];
  testimonial: ReviewListItem | undefined;
  tileImage: string;
  cropTile?: boolean;
}) {
  return (
    // Mobile (node 761:4877 "Shop"): a horizontal-scroll carousel, not a
    // wrapping grid. At desk:+ it reverts to the desktop row, which already
    // fits everything on one line at 1440px so the scroll track is hidden.
    <ScrollCarousel
      gap="gap-8"
      className="max-w-[90rem] items-start desk:flex-wrap desk:justify-between"
      trackClassName="hidden"
    >
      <TestimonialTile review={testimonial} image={tileImage} crop={cropTile} />
      {products.map((product) => (
        <ProductCard key={product.id} product={product} eager />
      ))}
    </ScrollCarousel>
  );
}

function AboutSection() {
  return (
    <section className="relative flex flex-col items-center bg-onwei-purple px-3 py-14 desk:px-14 desk:py-[4.5rem]">
      <div className="flex w-full max-w-[90rem] flex-col items-center gap-8 desk:flex-row desk:items-end desk:justify-between">
        <div className="flex w-full max-w-[39.9375rem] flex-col items-center gap-7 text-center desk:relative desk:items-stretch desk:gap-8 desk:text-left">
          {/* Desktop (node 758:2356): circle and underlines are pinned to the
              column, x/y from Figma (px / 16), so they sit on the words at the
              designed size. Mobile pins its own set to the section. */}
          <Image
            src="/images/about/circle-move.svg"
            alt=""
            width={199}
            height={74}
            aria-hidden
            className="pointer-events-none absolute left-[14.625rem] top-[-0.2269rem] hidden desk:block"
          />
          <Image
            src="/images/about/underline-1.svg"
            alt=""
            width={213}
            height={7}
            aria-hidden
            className="pointer-events-none absolute left-[20.3125rem] top-[8.1875rem] hidden desk:block"
          />
          <Image
            src="/images/about/underline-2.svg"
            alt=""
            width={248}
            height={7}
            aria-hidden
            className="pointer-events-none absolute left-[21.375rem] top-[12.625rem] hidden desk:block"
          />
          {/* Mobile (node 761:4849): the three underlines are pinned to the
              section, left as % of width and top in rem, from that frame. */}
          <Image
            src="/images/about/underline-mobile-1.svg"
            alt=""
            width={89}
            height={3}
            aria-hidden
            className="pointer-events-none absolute left-[55.38%] top-[5.886rem] desk:hidden"
          />
          <Image
            src="/images/about/underline-mobile-2.svg"
            alt=""
            width={114}
            height={4}
            aria-hidden
            className="pointer-events-none absolute left-[58.72%] top-[8.323rem] desk:hidden"
          />
          <Image
            src="/images/about/underline-mobile-3.svg"
            alt=""
            width={142}
            height={5}
            aria-hidden
            className="pointer-events-none absolute left-[55.9%] top-[10.698rem] desk:hidden"
          />
          <p className="font-display text-[2.25rem] font-bold uppercase leading-[1.1] text-onwei-white desk:text-[4rem]">
            Built to{" "}
            <span className="relative inline-block">
              <span className="relative">move</span>
            </span>
            ,
            <br />
            Built with{" "}
            <span className="relative inline-block">
              <span className="relative">intent</span>
            </span>
            ,
            <br />
            Built by an{" "}
            <span className="relative inline-block">
              <span className="relative">athlete</span>
            </span>
            .
          </p>
          <div className="flex w-full max-w-[20.3125rem] flex-col gap-6 desk:max-w-none">
            {/* Mobile (761:4854) and desktop (758:2361) tell it in
                different words, so both are kept. */}
            <p className="font-grotesk text-body text-onwei-white desk:hidden">
              Onwei is for people who don&apos;t live in one lane - people
              constantly in motion between work, wellness, play, and everything
              else.
              <br />
              <br />
              We design elevated sports and fitness essentials for those who
              show up, no matter how busy life gets.
              <br />
              <br />
              Thoughtfully designed for consistency, comfort, and everyday use -
              because we believe progress isn&apos;t achieved in one intense
              session. It&apos;s built over time.
            </p>
            <p className="max-w-[30.25rem] font-grotesk text-body text-onwei-white max-desk:hidden">
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
              <span className="desk:hidden">meet the founders</span>
              <span className="max-desk:hidden">our story</span>
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
// model. "Explore blogs" opens the /journal index.
function JournalSection({ articles }: { articles: ArticleListItem[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-14 desk:px-14 desk:py-24">
      <div className="flex w-full max-w-[90rem] flex-col gap-[3.125rem]">
        {/* Desktop (758:2485) puts the title left and the button right, the
            underline hangs under "playbook" (x 289, 3.9rem down) without
            adding height. Mobile (761:5155) stacks them, centered. */}
        <div className="relative flex w-full flex-col items-center gap-6 desk:flex-row desk:items-end desk:justify-between">
          <div className="relative">
            <p className="text-center font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-left desk:text-display-md">
              from the <br className="desk:hidden" />
              playbook
            </p>
            <Image
              src="/images/journal/underline.svg"
              alt=""
              width={321}
              height={6}
              aria-hidden
              className="pointer-events-none absolute left-[calc(50%-6.0312rem)] top-[4.5rem] w-[12.0625rem] max-w-none desk:left-[18.0625rem] desk:top-[3.88rem] desk:w-[20.0625rem]"
            />
          </div>
          <CtaLink
            href="/journal"
            analytics={{
              event: "blog_nav_clicked",
              props: { target: "all_blogs", source: "home" },
            }}
            className="bg-onwei-blue text-onwei-beige max-desk:py-2.5"
          >
            <span className="desk:hidden">view all blogs</span>
            <span className="max-desk:hidden">explore blogs</span>
          </CtaLink>
        </div>

        {/* Mobile (761:5161): a carousel of 302.67px cards that opens with
            the middle card centered. From desk up it is an even 3-column
            row (flex-1, no fixed width). */}
        <ScrollCarousel
          gap="gap-6"
          className="desk:overflow-visible"
          trackClassName="hidden"
          centerChildOnMount={1}
        >
          {articles.map((post) => (
            <article
              key={post.slug}
              className="flex w-[18.9167rem] shrink-0 flex-col gap-3 desk:w-auto desk:flex-1 desk:shrink"
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
                <div className="flex w-full flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    {post.publishedAt ? (
                      <p className="font-grotesk text-[length:max(0.6875rem,11px)] font-light leading-[1.2143]">
                        {formatArticleDate(post.publishedAt)}
                      </p>
                    ) : null}
                    <p className="line-clamp-2 font-display text-[length:max(1.125rem,11px)] font-medium uppercase leading-[1.3] tracking-[0.0135rem] desk:line-clamp-1">
                      {post.title}
                    </p>
                  </div>
                  {post.excerpt ? (
                    <p className="line-clamp-2 font-grotesk text-body">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
                <TrackedLink
                  analytics={{
                    event: "blog_card_clicked",
                    props: { post_slug: post.slug, source: "home" },
                  }}
                  href={`/journal/${post.slug}`}
                  className="font-display text-[length:max(1rem,11px)] capitalize leading-[1.3] tracking-[0.012rem] underline"
                >
                  Read More
                </TrackedLink>
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
    pickleballCollection,
    pilatesCollection,
    heroTestimonial,
    wallReviews,
    heroMarqueeItems,
    showcaseMarqueeItems,
    valueProps,
    instagramPhotos,
    articles,
  ] = await Promise.all([
    listActiveProductsByCategorySlug("pickleball"),
    listActiveProductsByCategorySlug("pilates"),
    listSurfaceReviews({ surface: "HOME_HERO" }),
    listSurfaceReviews({ surface: "HOME_WALL" }),
    listMarqueeItems("HOME_HERO"),
    listMarqueeItems("HOME_SHOWCASE"),
    listValueProps(),
    listInstagramPhotos(),
    listPublishedArticles(3),
  ]);
  // Figma draws two states of this row, "pickle ball" picked (758:2325) and
  // the second tab picked (758:2632). Each tab shows its own category's
  // products, never another category's under a picked tab.
  const shopTabs: ShopTab[] = [
    {
      key: "pickleball",
      label: "pickle ball",
      mobileLabel: "pickleball",
      panel: (
        <ShopPanel
          products={(pickleballCollection?.products ?? []).slice(0, 3)}
          testimonial={heroTestimonial[0]}
          tileImage="/images/product-grid/testimonial-bg.png"
          cropTile
        />
      ),
    },
    {
      key: "pilates",
      label: "pilates",
      panel: (
        <ShopPanel
          products={(pilatesCollection?.products ?? []).slice(0, 3)}
          testimonial={heroTestimonial[0]}
          tileImage="/images/product-grid/testimonial-bg-yoga.png"
        />
      ),
    },
  ];

  return (
    <main>
      <SiteHeader />
      <HeroSection marqueeItems={heroMarqueeItems} />
      <ShowcaseSection
        marqueeItems={showcaseMarqueeItems}
        valueProps={valueProps}
      />
      <ShopTabs tabs={shopTabs} />
      <AboutSection />
      {/* Mobile frame (761:5063) has its own marquee strip between About and
          Reviews, desktop does not. It reuses the Showcase strip items,
          which the mobile layout no longer shows in its own section. */}
      <div className="bg-onwei-white px-3 pb-6 pt-3 desk:hidden">
        <MarqueeBar items={showcaseMarqueeItems} />
      </div>
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
      <InstagramGrid photos={instagramPhotos} mobileHeading="@onwei" />
      <SiteFooter desktopHeading={["Move with", "Onwei"]} />
    </main>
  );
}
