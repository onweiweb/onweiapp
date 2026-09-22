import Image from "next/image";
import Link from "next/link";
import { listActiveCategories, listFeaturedProducts } from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductCard } from "@/_components/ProductCard";
import { CategoryTile } from "@/_components/CategoryTile";

const HERO_MARQUEE_ITEMS = [
  "OWN YOUR EFFORT",
  "NOT PERFECTLY, JUST CONSISTENTLY",
  "BUILT FOR EVERYDAY",
  "EVEN 20 MINUTES COUNT",
  "PLAY. PAUSE. PROGRESS.",
  "AT YOUR OWN PACE",
];

const SHOWCASE_MARQUEE_ITEMS = [
  "BUILT BY AN ATHLETE",
  "FOR EVERYDAY USE",
  "COMFORTABLE GRIP",
  "BUILT FOR PERFORMANCE",
  "ELEVATED DESIGN",
  "FOR EVERYDAY USE",
];

const VALUE_PROPS = [
  {
    illustration: "/images/showcase/value-prop-1.svg",
    width: 151,
    height: 82,
    title: "Designed Intentionally",
    body: "You shouldn’t have to choose between performance, durability, and good design.",
  },
  {
    illustration: "/images/showcase/value-prop-2.svg",
    width: 168,
    height: 60,
    title: "Designed for consistent use",
    body: "You show up — between work, life and everything else. Your gear should match that effort.",
  },
  {
    illustration: "/images/showcase/value-prop-3.svg",
    width: 170,
    height: 67,
    title: "Designed to Belong",
    body: "Products you’ll feel good using, carrying and coming back to every day.",
  },
] as const;

const REVIEW_TEXT = {
  rating: 5,
  title: "Best mat I have owned!!",
  body: "Five days a week for three months and it still looks brand new. The grip holds even when I'm sweating through a tough flow. Worth every penny.",
  reviewer: "Melanie N.",
} as const;

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

const INSTAGRAM_PHOTOS = [
  "/images/instagram/photo-1.png",
  "/images/instagram/photo-2.png",
  "/images/instagram/photo-3.png",
  "/images/instagram/photo-4.png",
  "/images/instagram/photo-5.png",
];

function StarRow({ count, size = 18 }: { count: number; size?: number }) {
  return (
    <div className="flex items-start gap-0.5">
      {Array.from({ length: count }).map((_, index) => (
        <Image
          key={index}
          src="/images/shared/star-full.svg"
          alt=""
          width={size}
          height={size}
          aria-hidden
        />
      ))}
    </div>
  );
}

function MarqueeBar({ items }: { items: readonly string[] }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="w-full overflow-hidden rounded-[20px] bg-onwei-blue px-14 py-3"
      aria-hidden
    >
      <div className="flex w-max animate-[onwei-marquee_28s_linear_infinite] gap-6">
        {doubled.map((item, index) => (
          <div key={index} className="flex shrink-0 items-center gap-6">
            <p className="whitespace-nowrap font-grotesk text-label uppercase text-onwei-white">
              {item}
            </p>
            <Image
              src="/images/hero/marquee-divider.svg"
              alt=""
              width={20}
              height={15}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-[30px] px-6 py-3 font-grotesk text-label uppercase ${className}`}
    >
      {children}
    </Link>
  );
}

function HeroSection() {
  return (
    // bg-onwei-green: best-effort match, not confirmed against Figma —
    // the section previously had no background at all (rendered white).
    // Figma's API is rate-limited right now; re-verify the exact fill once
    // access resets.
    <section className="flex flex-col items-center gap-6 bg-onwei-green pb-14">
      <div className="flex w-full max-w-[1440px] flex-col gap-6 px-11 lg:flex-row">
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

      <div className="w-full max-w-[1360px] px-11">
        <MarqueeBar items={HERO_MARQUEE_ITEMS} />
      </div>
    </section>
  );
}

function ShowcaseSection() {
  return (
    <section className="flex flex-col items-center bg-onwei-green px-14 py-14">
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
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.title}
                className="flex flex-1 flex-col items-center justify-center gap-8 rounded-[30px] bg-onwei-purple px-6 py-8 text-center"
              >
                <Image
                  src={prop.illustration}
                  alt=""
                  width={prop.width}
                  height={prop.height}
                  aria-hidden
                />
                <div className="flex flex-col items-start gap-3 text-left text-onwei-white">
                  <p className="font-display text-[18px] font-medium uppercase tracking-[0.216px]">
                    {prop.title}
                  </p>
                  <p className="font-grotesk text-[14px]">{prop.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <MarqueeBar items={SHOWCASE_MARQUEE_ITEMS} />
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
    <section className="flex items-end justify-center bg-onwei-white px-14 pb-12 pt-16">
      <div className="flex w-full max-w-[1440px] flex-wrap items-end justify-between gap-8">
        <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
          shop our gear
        </p>
        <div className="flex items-start gap-8">
          <CategoryTile label="pickle ball" href={pickleballHref} circled />
          <CategoryTile label="yoga mats" href={pilatesHref} />
        </div>
      </div>
    </section>
  );
}

function TestimonialTile() {
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
        <StarRow count={REVIEW_TEXT.rating} />
        <p className="font-grotesk text-[14px] font-bold">
          {REVIEW_TEXT.title}
        </p>
        <p className="font-grotesk text-[14px]">{REVIEW_TEXT.body}</p>
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
}: {
  products: Awaited<ReturnType<typeof listFeaturedProducts>>;
}) {
  return (
    <section className="flex flex-col items-center bg-onwei-white px-14 pb-24">
      <div className="flex w-full max-w-[1440px] flex-wrap items-start justify-center gap-8">
        <TestimonialTile />
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

function ReviewCard({ tone }: { tone: "purple" | "dark" }) {
  return (
    <div
      className={`flex h-[429px] w-[341px] shrink-0 flex-col items-center justify-center gap-8 rounded-[30px] px-12 pb-10 pt-8 text-center text-onwei-beige ${
        tone === "purple" ? "bg-onwei-purple" : "bg-onwei-blue"
      }`}
    >
      <StarRow count={REVIEW_TEXT.rating} />
      <p className="font-grotesk text-[14px] font-bold">{REVIEW_TEXT.title}</p>
      <p className="font-grotesk text-[14px]">{REVIEW_TEXT.body}</p>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-display text-[16px] font-semibold uppercase tracking-[-0.16px]">
          {REVIEW_TEXT.reviewer}
        </p>
        <div className="flex items-center gap-1">
          <Image
            src="/images/reviews/check.svg"
            alt=""
            width={18}
            height={18}
            aria-hidden
          />
          <span className="font-display text-[16px] font-semibold uppercase tracking-[-0.16px] opacity-70">
            Verified Review
          </span>
        </div>
      </div>
    </div>
  );
}

function ReviewPhoto({ src }: { src: string }) {
  return (
    <div className="relative h-[429px] w-[498px] shrink-0 overflow-hidden rounded-[30px]">
      <Image src={src} alt="" fill sizes="498px" className="object-cover" />
    </div>
  );
}

function ReviewsSection() {
  return (
    <section
      id="reviews"
      className="flex flex-col items-center bg-onwei-white px-12 py-24"
    >
      <div className="flex w-full max-w-[1440px] flex-col items-center gap-8">
        <div className="relative flex w-full flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
              Chosen by 1000+
              <br />
              everyday movers
            </p>
            <Image
              src="/images/reviews/underline.svg"
              alt=""
              width={526}
              height={4}
              aria-hidden
              className="max-w-full"
            />
          </div>
          <span className="relative flex items-center gap-2 font-script text-script-md uppercase text-onwei-blue">
            share your Onwei routine
            <Image
              src="/images/reviews/arrow.svg"
              alt=""
              width={20}
              height={17}
              aria-hidden
              className="-rotate-[30deg]"
            />
          </span>
          <CtaLink href="#" className="bg-onwei-blue text-onwei-beige">
            view all reviews
          </CtaLink>
        </div>

        <div className="flex w-full gap-4 overflow-x-auto pb-4">
          <ReviewCard tone="purple" />
          <ReviewPhoto src="/images/reviews/photo-1.png" />
          <ReviewCard tone="purple" />
          <ReviewPhoto src="/images/reviews/photo-2.png" />
          <ReviewCard tone="dark" />
          <ReviewPhoto src="/images/reviews/photo-1.png" />
        </div>

        <div className="h-0.5 w-full max-w-[1344px] rounded-full bg-onwei-blue/20">
          <div className="h-0.5 w-[272px] rounded-full bg-onwei-blue" />
        </div>
      </div>
    </section>
  );
}

function JoinMovementSection() {
  return (
    <section className="flex items-end justify-center bg-onwei-green px-8 py-14 lg:px-[120px]">
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
    <section className="flex flex-col items-center bg-onwei-white px-14 py-24">
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

        <div className="flex w-full flex-col gap-6 lg:flex-row">
          {JOURNAL_ARTICLES.map((post) => (
            <article key={post.title} className="flex flex-1 flex-col gap-3">
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

// Static — no Instagram feed integration exists; images and handle are
// hardcoded straight from the Figma file.
function InstagramSection() {
  return (
    // bg-onwei-green: same best-effort fix as Hero/Nav — was rendering
    // with no background at all. Not yet re-verified against Figma.
    <section className="flex flex-col items-center bg-onwei-green px-14 py-24">
      <div className="flex w-full max-w-[1440px] flex-col items-start gap-12">
        <div className="relative flex w-full flex-col items-center gap-3">
          <span className="relative flex items-center gap-2 font-script text-script-md uppercase text-onwei-blue">
            follow us on instagram
            <Image
              src="/images/instagram/arrow.svg"
              alt=""
              width={20}
              height={26}
              aria-hidden
              className="-rotate-[27deg]"
            />
          </span>
          <p className="font-display text-[48px] font-bold uppercase leading-[0.9] text-onwei-blue lg:text-[70px]">
            @OnweiMoves
          </p>
        </div>
        <div className="flex w-full gap-4 overflow-x-auto">
          {INSTAGRAM_PHOTOS.map((src, index) => (
            <div
              key={src}
              className="relative h-[420px] w-[340px] shrink-0 overflow-hidden rounded-[30px]"
            >
              <Image
                src={src}
                alt={`Onwei community photo ${index + 1}`}
                fill
                sizes="340px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    listActiveCategories(),
    listFeaturedProducts(3),
  ]);
  const pickleball = categories.find(
    (category) => category.slug === "pickleball",
  );
  const pilates = categories.find((category) => category.slug === "pilates");

  return (
    <main>
      <SiteHeader />
      <HeroSection />
      <ShowcaseSection />
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
      <ProductGridSection products={products} />
      <AboutSection />
      <ReviewsSection />
      <JoinMovementSection />
      <JournalSection />
      <InstagramSection />
      <SiteFooter />
    </main>
  );
}
