import type { Metadata } from "next";
import Image from "@/_components/ScaledImage";
import { getSiteSetting } from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { WaitlistHeader } from "@/_components/WaitlistHeader";
import { WaitlistFooter } from "@/_components/WaitlistFooter";
import { ScrollReveal } from "@/_components/ScrollReveal";
import { HoverLink } from "@/_components/HoverLink";

// Built from Figma (file dQvPgsv3kEAYb4ca5mu08U, frame 760:4492 "About Us" /
// 969:3987 "About Us - mobile", supersedes an earlier note here claiming no
// mobile variant existed; it does, in this file, and the decorative accents
// below now have mobile positions measured from it). Decorative accents
// (squiggles/arrows/ribbon banners, nodes 760:4566, 760:4600, 760:4639,
// 760:4642, 760:4654, 760:4658, 760:4660) are exported SVGs/PNGs from those
// exact nodes, positioned relative to their anchor text/photo rather than at
// Figma's raw canvas coordinates, those coordinates assume a fixed 1440px
// frame and don't survive this page's responsive layout. Mobile sizes/offsets
// below are the desktop figure scaled by 0.625 (the ratio between this page's
// mobile and desktop heading font sizes), not independently re-measured node
// positions, close enough for decorative elements, but a visual check after
// deploy is worth it.
// Reads siteMode so this branches the same way `apps/web/proxy.ts` already
// gates routing, /about is the one normal page still reachable while
// siteMode === "WAITLIST" (see proxy.ts's allow-list), so its chrome needs
// to match the waitlist page's, not the full storefront's. Same revalidate
// reasoning as apps/web/app/ontheway/page.tsx: getSiteSetting() isn't a
// `fetch` call, so without this Next has no signal that the page depends on
// data that changes, and an admin flipping siteMode wouldn't show up here
// short of a redeploy.
export const revalidate = 30;

export const metadata: Metadata = {
  title: "About",
  description:
    "Built to move, built with intent, built by an athlete, the story behind Onwei.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const { siteMode, instagramUrl, youtubeUrl, spotifyUrl } =
    await getSiteSetting();
  const isWaitlistMode = siteMode === "WAITLIST";

  return (
    <main className="bg-onwei-green">
      {isWaitlistMode ? (
        <WaitlistHeader
          navHref="/ontheway"
          navLabel="Join the Movement"
          inverted
        />
      ) : (
        <SiteHeader inverted />
      )}

      <ScrollReveal
        as="section"
        className="mx-auto flex w-full max-w-[90rem] flex-col items-center gap-6 px-6 pb-6 pt-8 text-center desk:px-14"
      >
        <h1 className="relative font-display text-[2.5rem] font-bold uppercase leading-[1.1] text-onwei-blue desk:text-[4rem]">
          About us
        </h1>
        <div className="relative inline-block">
          <p className="font-display text-[length:max(1rem,11px)] font-medium uppercase text-onwei-blue">
            ( on&middot;wei, \ &#712;&auml;n-w&#257; / &ldquo;on-way&rdquo; )
          </p>
          {/* Mobile (Figma node 969:4038): tucked under the tail end of the
              text, not out in a side margin like desktop, there's no wide
              margin to sit in at this width. Same asset, same aspect ratio,
              just repositioned and scaled down for the narrower layout.
              top-full (not a small -bottom offset) so it starts right at
              the text's baseline, a negative bottom offset here previously
              pulled most of the image's height up into the glyphs instead
              of below them, crossing out "on-way" instead of underlining
              it. */}
          <Image
            src="/images/about-us/underline-about-pronunciation.png"
            alt=""
            width={64}
            height={15}
            aria-hidden
            className="pointer-events-none absolute -right-2 top-full -mt-1 desk:hidden"
          />
          <Image
            src="/images/about-us/underline-about-pronunciation.png"
            alt=""
            width={94}
            height={22}
            aria-hidden
            className="pointer-events-none absolute left-full top-1 ml-3 hidden desk:block"
          />
        </div>
        <div className="flex max-w-[48.3125rem] flex-col gap-4 font-grotesk text-[length:max(0.875rem,11px)] leading-relaxed text-onwei-blue">
          <p>
            Not a gear company. Not a wellness brand. Not another startup that
            discovered sport after reading a trend report.
          </p>
          <p>
            Onwei exists because two people, one who spent 15 years at the sharp
            end of competitive sport, and one who built careers around why
            people want the things they want -{" "}
            {/* Figma highlights this run with an actual asset (a painted
                purple brush stroke, node 760:4526 for this phrase, "Onwei
                Brand Assets-149", jagged hand-cut edges and a slight
                rotation, not a clean rectangle), not a flat CSS
                background-color. Each of the three highlighted phrases on
                this page has its OWN export, sized to that phrase's own
                width (701x27 here vs 352x27 for the other two, node
                760:4527/760:4634), reusing one shared texture across all
                three stretched the shorter phrases' strokes noticeably out
                of proportion, most visible at mobile's narrower line
                width. [box-decoration-break:clone] + a 100%/100%
                background-size still lets each phrase's own asset
                stretch-to-fit whichever line width it wraps to at any
                given viewport. */}
            <span
              className="px-1 text-onwei-white [background-size:100%_100%] [box-decoration-break:clone]"
              style={{
                backgroundImage:
                  "url(/images/about-us/highlight-looked-at.png)",
              }}
            >
              looked at India&apos;s fitness shelves and felt the same thing:
              this isn&apos;t it.
            </span>
          </p>
          <p>
            The equipment was either cheap and forgettable, or excellent and
            completely unaffordable. The design was an afterthought. The brands
            behind it were either intimidating or embarrassing. And the person
            this all hurt most was the one showing up every single day, not
            training for a podium, not a complete beginner,{" "}
            <span
              className="px-1 text-onwei-white [background-size:100%_100%] [box-decoration-break:clone]"
              style={{
                backgroundImage:
                  "url(/images/about-us/highlight-looked-at.png)",
              }}
            >
              just someone who takes their movement seriously and deserves gear
              that does the same.
            </span>
          </p>
          <p
            className="w-fit self-center px-1 text-onwei-white [background-size:100%_100%] [box-decoration-break:clone]"
            style={{
              backgroundImage: "url(/images/about-us/highlight-thats-who.png)",
            }}
          >
            That&apos;s who Onwei is for.
          </p>
        </div>
      </ScrollReveal>

      <section className="mx-auto grid w-full max-w-[90rem] grid-cols-1 gap-6 px-6 pb-6 desk:px-11 desk:grid-cols-2">
        <ScrollReveal
          as="div"
          className="order-2 flex flex-col items-center justify-end gap-6 rounded-[1.875rem] bg-onwei-purple px-6 py-8 text-center desk:px-14 desk:py-12 desk:order-1 desk:items-start desk:text-left"
        >
          <p className="relative inline-block w-fit font-display text-[2.5rem] font-bold uppercase leading-[1.1] text-onwei-white desk:text-[4rem]">
            {/* Figma: an oval outline wraps the whole name (node 969:4048
                mobile, 760:4566 desktop), not the small corner squiggle
                this used before, which was the wrong decoration entirely. */}
            <Image
              src="/images/about-us/circle-sabhya-mobile.svg"
              alt=""
              width={196}
              height={62}
              aria-hidden
              className="pointer-events-none absolute -left-[1.125rem] -top-[0.625rem] h-auto w-[calc(100%+2.25rem)] max-w-none desk:hidden"
            />
            <Image
              src="/images/about-us/circle-sabhya-desktop.svg"
              alt=""
              width={273}
              height={87}
              aria-hidden
              className="pointer-events-none absolute -left-[1.375rem] -top-[0.75rem] hidden h-auto w-[calc(100%+2.75rem)] max-w-none desk:block"
            />
            <span className="relative">Sabhya</span>
          </p>
          <div className="font-grotesk text-[length:max(0.875rem,11px)] leading-[1.3] text-onwei-white">
            <p>
              He grew up playing table tennis professionally, the kind of
              professional where weekends were tournaments, not plans. He
              represented India internationally and was ranked among the top 4
              in the country. Sport wasn&apos;t something he did on the side. It
              was just how he was wired.
            </p>
            <br />
            <p>
              Playing at that level meant access, to training, to facilities, to
              gear that actually matched how hard he was working. He didn&apos;t
              think much of it then. That&apos;s just how it worked when you
              were in those circles.
            </p>
            <br />
            <p>
              He eventually stepped back from professional table tennis. Picked
              up tennis, running, pickleball, padel, got deep into all of them.
              And somewhere in that shift from professional athlete to regular
              person at a sports store, the gap became impossible to ignore: the
              gear he&apos;d taken for granted as a pro simply wasn&apos;t
              available to everyone else. Not at a fair price. Not with any real
              thought behind how it looked. Not from an Indian brand worth being
              proud of.
            </p>
            <br />
            <p>
              That gap stopped being an observation and started being an itch he
              couldn&apos;t ignore.
            </p>
          </div>
          {!isWaitlistMode && (
            <span className="w-fit rounded-[1.875rem] bg-onwei-beige px-6 py-3 font-grotesk text-[length:max(0.875rem,11px)] uppercase text-onwei-blue">
              Read Sabhya&apos;s substack
            </span>
          )}
        </ScrollReveal>
        {/* Wrapper (not the photo div itself, which clips via
            overflow-hidden) so the pickleball-swing illustration (Figma
            node 760:4746) can hang below the photo's bottom edge like it
            does in Figma, instead of getting clipped. order-1/desk:order-2:
            Figma's mobile frame (969:3987) stacks the photo above the text
            card for this section, but desktop (760:4533) puts text on the
            left, this section is the only one of the two where the two
            breakpoints disagree on which comes first. */}
        <ScrollReveal
          as="div"
          delay={0.1}
          className="relative order-1 desk:order-2"
        >
          <div className="relative min-h-[25rem] overflow-hidden rounded-[1.875rem] desk:min-h-full">
            <Image
              src="/images/about-us/sabhya.png"
              alt="Sabhya, Onwei co-founder, playing table tennis in a tournament"
              fill
              sizes="((min-width: 768px)) 50vw, 100vw"
              className="object-cover"
            />
            <Image
              src="/images/footer/logo-circle.svg"
              alt=""
              width={90}
              height={90}
              aria-hidden
              className="pointer-events-none absolute right-6 top-6 hidden opacity-90 desk:block"
            />
          </div>
          {/* Figma's mobile frame has this on the RIGHT of the photo (not
              left, like desktop), the two breakpoints mirror each other
              here, matching how the mobile frame also flips which comes
              first, photo vs text card. */}
          <Image
            src="/images/about-us/illustration-pickleball-swing.svg"
            alt=""
            width={80}
            height={145}
            aria-hidden
            className="pointer-events-none absolute -bottom-10 right-[4%] z-10 desk:hidden"
          />
          <Image
            src="/images/about-us/illustration-pickleball-swing.svg"
            alt=""
            width={145}
            height={262}
            aria-hidden
            className="pointer-events-none absolute -bottom-16 left-[4%] z-10 hidden desk:block"
          />
        </ScrollReveal>
      </section>

      <section className="relative mx-auto grid w-full max-w-[90rem] grid-cols-1 gap-6 px-6 pb-6 desk:px-11 desk:grid-cols-2">
        {/* Outer wrapper (not the photo div itself, which clips via
            overflow-hidden) so the mobile plank illustration can hang below
            the photo's bottom edge, same reasoning as the Sabhya photo
            above. Needed only for mobile: on desktop the two grid columns
            are equal height (grid's default stretch), so bottom-0 on the
            plank image below, positioned relative to the whole section,
            already lands exactly on the seam between them. On mobile the
            columns stack, so that same bottom-0 would land at the very
            bottom of the second (text) column instead of at the photo/card
            seam, the plank needs its own anchor here instead. */}
        <ScrollReveal as="div" className="relative">
          <div className="relative min-h-[25rem] overflow-hidden rounded-[1.875rem] desk:min-h-full">
            <Image
              src="/images/about-us/sakshi.jpg"
              alt="Sakshi, Onwei co-founder, holding an Onwei yoga mat"
              fill
              sizes="((min-width: 768px)) 50vw, 100vw"
              className="object-cover object-top"
            />
            <Image
              src="/images/footer/logo-circle.svg"
              alt=""
              width={90}
              height={90}
              aria-hidden
              className="pointer-events-none absolute right-6 top-6 hidden opacity-90 desk:block"
            />
          </div>
          <Image
            src="/images/about-us/illustration-plank.svg"
            alt=""
            width={134}
            height={48}
            aria-hidden
            className="pointer-events-none absolute -bottom-6 left-1/2 z-10 -translate-x-1/2 desk:hidden"
          />
        </ScrollReveal>
        <Image
          src="/images/about-us/illustration-plank.svg"
          alt=""
          width={243}
          height={87}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 desk:block"
        />
        <ScrollReveal
          as="div"
          delay={0.1}
          className="flex flex-col items-center justify-end gap-6 rounded-[1.875rem] bg-onwei-purple px-6 py-8 text-center desk:px-14 desk:py-12 desk:items-start desk:text-left"
        >
          <p className="relative inline-block w-fit font-display text-[2.5rem] font-bold uppercase leading-[1.1] text-onwei-white desk:text-[4rem]">
            {/* Sakshi gets the same oval outline as Sabhya at both
                breakpoints (client feedback: desktop was missing it, the
                Figma desktop frame had none). Desktop reuses Sabhya's
                oval asset, sized off the name's own width. */}
            <Image
              src="/images/about-us/circle-sakshi-mobile.svg"
              alt=""
              width={196}
              height={62}
              aria-hidden
              className="pointer-events-none absolute -left-[1.125rem] -top-[0.625rem] h-auto w-[calc(100%+2.25rem)] max-w-none desk:hidden"
            />
            <Image
              src="/images/about-us/circle-sabhya-desktop.svg"
              alt=""
              width={273}
              height={87}
              aria-hidden
              className="pointer-events-none absolute -left-[1.375rem] -top-[0.75rem] hidden h-auto w-[calc(100%+2.75rem)] max-w-none desk:block"
            />
            <span className="relative">Sakshi</span>
          </p>
          <div className="font-grotesk text-[length:max(0.875rem,11px)] leading-[1.3] text-onwei-white">
            <p>
              Even at 22, she couldn&apos;t buy something ugly. Life was too
              short. She spent years at LVMH understanding why people pay a
              premium for things that make them feel something, and years at
              Marico and Diageo understanding how to make that feeling
              accessible to more people. She got very good at the gap between
              the two. She found Pilates. Then functional movement. Then a
              deeply unhealthy amount of time following global fitness creators
              whose lives looked like a beautiful, sweaty Pinterest board. She
              was in. Completely.
            </p>
            <br />
            <p>
              Her mat looked clinical. Her resistance band came in a zip-lock
              bag, like a snack. Her gym bag had given up on life. Meanwhile
              everything she was watching online, the studios, the creators, the
              aesthetic, looked aspirational and effortless.
            </p>
            <br />
            <p>
              The gear available to her in India? Distinctly not. She
              didn&apos;t want to pay Lululemon prices. She didn&apos;t want
              Decathlon aesthetics. She wanted the thing in the middle. It
              didn&apos;t exist. She made a note.
            </p>
          </div>
        </ScrollReveal>
      </section>

      <ScrollReveal
        as="section"
        className="relative mx-auto flex w-full max-w-[90rem] flex-col items-center gap-6 px-6 pb-6 pt-12 text-center desk:px-14"
      >
        {/* Mobile only (Figma node 969:4237), a small double-stroke
            underline beneath "THEN THEY GOT" (first line of the heading),
            near the section's left margin, not the swirled arrow desktop
            gets to the heading's right (which Figma's mobile frame doesn't
            have at all, confirmed absent, not just hidden here). Top offset
            is an approximation (Figma's own y-coordinate doesn't map 1:1
            onto this section's padding), eyeballed to land under the first
            line at this font size, worth a visual check after deploy. */}
        <Image
          src="/images/about-us/underline-married-heading-mobile.png"
          alt=""
          width={89}
          height={16}
          aria-hidden
          className="pointer-events-none absolute left-6 top-24 desk:hidden"
        />
        <Image
          src="/images/about-us/squiggle-arrow-married.svg"
          alt=""
          width={113}
          height={58}
          aria-hidden
          className="pointer-events-none absolute right-[8%] top-6 hidden desk:block"
        />
        <h2 className="font-display text-[2rem] font-bold uppercase leading-[1.1] text-onwei-blue desk:text-[4rem]">
          Then they got married.
        </h2>
        <div className="relative inline-block">
          <p className="font-display text-[length:max(1rem,11px)] font-medium uppercase text-onwei-blue">
            (The mental notes became a brand.)
          </p>
          <Image
            src="/images/about-us/underline-married.svg"
            alt=""
            width={119}
            height={16}
            aria-hidden
            className="pointer-events-none absolute -bottom-2 left-1/2 hidden -translate-x-1/2 desk:block"
          />
        </div>
        <div className="flex max-w-[48.3125rem] flex-col gap-1 font-grotesk text-[length:max(0.875rem,11px)] leading-relaxed text-onwei-blue">
          <p>
            Two SRCC and ISB alumni who couldn&apos;t stop talking about fitness
            and gear.
          </p>
          <p>Somehow this felt more useful than investment banking.</p>
          <p>
            Sabhya obsesses over whether it actually performs. Sakshi obsesses
            over{" "}
            <span
              className="px-1 text-onwei-white [background-size:100%_100%] [box-decoration-break:clone]"
              style={{
                backgroundImage: "url(/images/about-us/highlight-married.png)",
              }}
            >
              whether you&apos;d actually want it. Together they&apos;ve set a
              bar that&apos;s probably unreasonable, and are having a great time
              trying to clear it.
            </span>
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal
        as="section"
        className="mx-auto w-full max-w-[90rem] px-6 pb-14 desk:px-11"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.875rem] desk:aspect-[16/9]">
          <Image
            src="/images/about-us/married.jpg"
            alt="Sabhya and Sakshi at a theatre together"
            fill
            sizes="100vw"
            className="object-cover object-top"
          />
        </div>
      </ScrollReveal>

      <ScrollReveal
        as="section"
        className="relative flex w-full flex-col items-center bg-onwei-white px-6 py-12 text-center desk:px-14"
      >
        <Image
          src="/images/about-us/ribbon-show-up-consistency.png"
          alt=""
          width={227}
          height={121}
          aria-hidden
          className="pointer-events-none absolute left-[6%] top-1/2 hidden -translate-y-1/2 desk:block"
        />
        <div className="flex w-full max-w-[90rem] flex-col items-center gap-6">
          <h2 className="font-display text-[2.5rem] font-bold uppercase leading-[1.1] text-onwei-blue desk:text-[4rem]">
            Why{" "}
            <span className="relative inline-block">
              <Image
                src="/images/about-us/squiggle-onwei-circle.svg"
                alt=""
                width={136}
                height={76}
                aria-hidden
                className="pointer-events-none absolute -left-[0.625rem] -top-[1.125rem] desk:hidden"
              />
              <Image
                src="/images/about-us/squiggle-onwei-circle.svg"
                alt=""
                width={217}
                height={121}
                aria-hidden
                className="pointer-events-none absolute -left-4 -top-7 hidden desk:block"
              />
              <span className="relative">Onwei</span>
            </span>
          </h2>
          <div className="flex max-w-[48.3125rem] flex-col gap-4 font-grotesk text-[length:max(0.875rem,11px)] leading-relaxed text-onwei-blue">
            <p>
              Because the person who shows up at 7am when no one&apos;s watching
              deserves better than gear that gave up before they did.
            </p>
            <p>
              Not stripped down because you&apos;re not a pro. Not marked up
              because you have taste and aspiration. Not generic because
              affordable was all that was on offer.
            </p>
            <p>
              On, present, engaged, in it. Wei (&#20026;), the choice to act.
              Not forcing it. Not performing it. Just doing it, on your terms,
              at your pace, consistently.
            </p>
            <p>That&apos;s the only kind of progress that actually sticks.</p>
          </div>
          <p className="font-display text-[length:max(1rem,11px)] font-bold uppercase text-onwei-blue">
            Show up. Stay on. That&apos;s Onwei.
          </p>
          <div className="relative">
            <Image
              src="/images/about-us/arrow-explore.svg"
              alt=""
              width={86}
              height={76}
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-2 hidden desk:block"
            />
            <HoverLink
              href={
                isWaitlistMode
                  ? "/ontheway#join-onwei-insiders"
                  : "/collection/pickleball"
              }
              className="rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-[length:max(0.875rem,11px)] uppercase text-onwei-beige"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {isWaitlistMode ? "Join the Movement" : "Explore the collection"}
            </HoverLink>
          </div>
        </div>
      </ScrollReveal>

      {isWaitlistMode ? (
        <WaitlistFooter
          instagramUrl={instagramUrl}
          youtubeUrl={youtubeUrl}
          spotifyUrl={spotifyUrl}
        />
      ) : (
        <SiteFooter />
      )}
    </main>
  );
}
