import Image from "next/image";
import Link from "next/link";
import {
  listActiveCategories,
  listActiveProductsByCategorySlug,
  listInstagramPhotos,
  listMarqueeItems,
  listSurfaceReviews,
  listValueProps,
} from "@onwei/core";
import type {
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
import { StarRow } from "@/_components/StarRow";
import { CtaLink } from "@/_components/CtaLink";

const JOURNAL_ARTICLES = [
  {
    image: "/images/journal/article-1.png",
    date: "Feb 25, 2026",
    title: "5 Drills to Improve Your Pickleball Dink Game",
  },
  {
    image: "/images/journal/article-2.png",
    date: "Feb 25, 2026",
    title: "Morning Yoga Routine for Athletes",
  },
  {
    image: "/images/journal/article-3.png",
    date: "Feb 25, 2026",
    title: "How to Choose Your First Pickleball Racquet",
  },
] as const;

const JOURNAL_BODY =
  "Lorem ipsum dolor sit amet consectetur. Arcu diam pellentesque libero iaculis adipiscing. Turpis sem odio gravida sagittis pretium velit non. Dignissim mauris purus vitae mattis turpis eu. Pharetra eu arcu integer integer elementum. Ullamcorper mattis lectus turpis nulla tristique tincidunt. Eget odio semper facilisis mauris id elementum faucibus non purus. Volutpat porta integer in feugiat tortor eu diam volutpat.";

function HeroSection({ marqueeItems }: { marqueeItems: string[] }) {
  return (
    // bg-onwei-green: best-effort match, not confirmed against Figma —
    // the section previously had no background at all (rendered white).
    // Figma's API is rate-limited right now; re-verify the exact fill once
    // access resets.
    <section className="flex flex-col items-center gap-3 bg-onwei-green pb-14 sm:gap-6">
      <div className="flex w-full max-w-[1440px] flex-col gap-3 px-3 sm:gap-6 sm:px-6 lg:px-11 lg:flex-row">
        <div className="relative flex h-[500px] w-full flex-col justify-end gap-8 overflow-hidden rounded-[30px] px-8 py-12 lg:h-[635px] lg:px-14 lg:py-24">
          <Image
            src="/images/hero/pickleball-bg.png"
            alt="Woman sitting on a pickleball court holding a paddle"
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative flex flex-col gap-8">
            <p className="font-display text-[48px] font-bold uppercase leading-[0.9] text-onwei-beige lg:text-display-xl">
              Made for everyday play
            </p>
            <CtaLink
              href="/collection/pickleball"
              className="w-fit bg-onwei-beige text-onwei-blue"
            >
              shop pickleball
            </CtaLink>
            <span className="flex items-center gap-2">
              <p className="font-script text-script-md uppercase text-onwei-beige">
                Serve. Rally. Repeat.
              </p>
              <Image
                src="/images/hero/arrow-1.svg"
                alt=""
                width={22}
                height={48}
                aria-hidden
                className="hidden -rotate-[75deg] sm:block"
              />
            </span>
          </div>
        </div>

        <div className="relative flex h-[500px] w-full flex-col justify-end gap-8 overflow-hidden rounded-[30px] px-8 py-12 lg:h-[635px] lg:px-14 lg:py-24">
          <Image
            src="/images/hero/pilates-bg.png"
            alt="Rolled yoga mat with an Onwei stamp"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <Image
            src="/images/hero/badge-stamp.svg"
            alt=""
            width={70}
            height={70}
            aria-hidden
            className="absolute right-6 top-6 hidden sm:block"
          />
          <div className="relative flex flex-col gap-8">
            <p className="font-display text-[48px] font-bold uppercase leading-[0.9] text-onwei-beige lg:text-display-xl">
              Movement,
              <br />
              your own way
            </p>
            <CtaLink
              href="/collection/pilates"
              className="w-fit bg-onwei-beige text-onwei-blue"
            >
              shop pilates
            </CtaLink>
            <div className="flex flex-col items-start gap-1">
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
                  className="hidden -rotate-[38deg] sm:block"
                />
              </span>
              <Image
                src="/images/hero/underline-1.svg"
                alt=""
                width={344}
                height={5}
                aria-hidden
                className="hidden max-w-[280px] sm:block"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1360px] px-3 sm:px-6 lg:px-11">
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
    <section className="flex flex-col items-center bg-onwei-green px-3 py-14 sm:px-6 lg:px-14">
      <div className="flex w-full max-w-[1440px] flex-col gap-12">
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
              className="h-[22px] w-[10px] -rotate-90"
            />
            at your pace
          </span>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="relative h-[420px] w-full overflow-hidden rounded-[30px] lg:h-[646px] lg:w-[824px]">
            <Image
              src="/images/showcase/video-poster.png"
              alt="Rolled yoga mat, paused video preview"
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
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
    <section className="flex items-end justify-center bg-onwei-white px-3 pb-12 pt-16 sm:px-6 lg:px-14">
      <div className="flex w-full max-w-[1440px] flex-wrap items-end justify-between gap-8">
        <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
          shop our gear
        </p>
        <div className="flex items-start gap-8">
          <CategoryTile label="pickle ball" href={pickleballHref} circled />
          <CategoryTile label="pilates" href={pilatesHref} />
        </div>
      </div>
    </section>
  );
}

function TestimonialTile({ review }: { review: ReviewListItem | undefined }) {
  if (!review) return null;
  return (
    <div className="relative flex h-[420px] w-full max-w-[375px] shrink-0 flex-col items-center justify-center gap-8 overflow-hidden rounded-[30px] p-8">
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
          <p className="font-grotesk text-[14px] font-bold">{review.title}</p>
        ) : null}
        <p className="font-grotesk text-[14px]">{review.body}</p>
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
    <section className="flex flex-col items-center bg-onwei-white px-3 pb-24 sm:px-6 lg:px-14">
      {/* Mobile (node 761:4877 "Shop"): a horizontal-scroll carousel, not a
          wrapping grid — matches the same pattern as Reviews/Instagram. At
          lg:+ it reverts to the desktop row, which already fits everything
          on one line at 1440px so overflow-x-auto has no visible effect. */}
      <div className="no-scrollbar flex w-full max-w-[1440px] items-start gap-8 overflow-x-auto lg:flex-wrap lg:justify-center">
        <TestimonialTile review={testimonial} />
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="flex flex-col items-center bg-onwei-purple px-6 py-14 sm:px-14">
      <div className="flex w-full max-w-[1440px] flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-full max-w-[639px] flex-col gap-8">
          <p className="font-display text-[36px] font-bold uppercase leading-[1.1] text-onwei-white sm:text-[48px] lg:text-[64px]">
            Built to{" "}
            <span className="relative inline-block">
              <Image
                src="/images/about/circle-move.svg"
                alt=""
                width={199}
                height={74}
                aria-hidden
                className="pointer-events-none absolute -left-[15%] -top-[45%] -z-0 w-[130%] max-w-none"
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
          <div className="flex flex-col gap-6">
            <p className="max-w-[484px] font-grotesk text-[14px] text-onwei-white">
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
              className="w-fit bg-onwei-beige text-onwei-blue"
            >
              our story
            </CtaLink>
          </div>
        </div>
        <div className="relative h-[320px] w-full max-w-[600px] overflow-hidden rounded-[30px] lg:h-[518px]">
          <Image
            src="/images/about/photo.png"
            alt="Blurred motion shot of an athlete moving on court"
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function JoinMovementSection() {
  return (
    <section className="flex items-end justify-center bg-onwei-green px-3 py-14 sm:px-8 lg:px-[120px]">
      <div className="relative flex w-full max-w-[1440px] items-end justify-center gap-2.5">
        {/* Straddles the section boundary in Figma — half the illustration
          sits in the white space above this section, not fully inside it. */}
        <Image
          src="/images/about2/illustration.svg"
          alt=""
          width={205}
          height={202}
          aria-hidden
          className="pointer-events-none absolute right-[38%] -top-24 hidden md:block"
        />
        <div className="flex w-full flex-col items-start justify-between gap-8 lg:flex-row">
          <p className="max-w-[578px] font-display text-[48px] font-bold uppercase leading-[0.9] text-onwei-blue lg:text-[70px]">
            Join the Movement
          </p>
          <div className="relative flex flex-col items-start gap-6">
            <p className="max-w-[484px] font-grotesk text-[14px] text-onwei-blue">
              Movement events, community sessions, early access, product
              testing, and exclusive rewards - and a say in what we build next!
            </p>
            <CtaLink href="#" className="bg-onwei-blue text-onwei-beige">
              Find Your Wei
            </CtaLink>
            <Image
              src="/images/about2/underline.svg"
              alt=""
              width={285}
              height={2}
              aria-hidden
              className="pointer-events-none absolute -left-1 top-[52px] w-[285px] max-w-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Static — no blog/article model exists in this codebase (see
// docs/DATABASE_SCHEMA.md). All three posts, dates and body copy are
// hardcoded straight from the Figma file.
function JournalSection() {
  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-24 sm:px-6 lg:px-14">
      <div className="flex w-full max-w-[1440px] flex-col gap-12">
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
          <CtaLink href="#" className="bg-onwei-blue text-onwei-beige">
            explore blogs
          </CtaLink>
        </div>

        {/* Mobile (node 761:5154): horizontal-scroll carousel of fixed-
            width cards, matching Shop/Reviews/Instagram. At lg:+ this
            reverts to an even 3-column row (flex-1, no fixed width). */}
        <div className="no-scrollbar flex w-full gap-6 overflow-x-auto lg:overflow-visible">
          {JOURNAL_ARTICLES.map((post) => (
            <article
              key={post.title}
              className="flex w-[300px] shrink-0 flex-col gap-3 lg:w-auto lg:flex-1 lg:shrink"
            >
              <div className="relative aspect-[416/280] w-full overflow-hidden rounded-[20px] bg-[#d4d4d4]">
                <Image
                  src={post.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col items-start gap-6 text-onwei-blue">
                <div className="flex flex-col gap-2">
                  <p className="font-grotesk text-[11px] font-light">
                    {post.date}
                  </p>
                  <p className="font-display text-[18px] font-medium uppercase tracking-[0.216px]">
                    {post.title}
                  </p>
                  <p className="font-grotesk text-[14px]">{JOURNAL_BODY}</p>
                </div>
                <Link href="#" className="text-[16px] underline capitalize">
                  Read More
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// No live Instagram feed integration exists — photos are CMS-editable
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
  ] = await Promise.all([
    listActiveCategories(),
    listActiveProductsByCategorySlug("pickleball"),
    listSurfaceReviews({ surface: "HOME_HERO" }),
    listSurfaceReviews({ surface: "HOME_WALL" }),
    listMarqueeItems("HOME_HERO"),
    listMarqueeItems("HOME_SHOWCASE"),
    listValueProps(),
    listInstagramPhotos(),
  ]);
  const pickleball = categories.find(
    (category) => category.slug === "pickleball",
  );
  const pilates = categories.find((category) => category.slug === "pilates");
  // ShopSection's "pickle ball" tile is always the one shown as selected
  // (Figma's Homepage frame only specifies this one state, no interactive
  // toggle), so the grid below it shows pickleball products to match —
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
      <JournalSection />
      <InstagramGrid photos={instagramPhotos} />
      <SiteFooter />
    </main>
  );
}
