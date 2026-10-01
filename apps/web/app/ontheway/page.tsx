import Image from "@/_components/ScaledImage";
import { getSiteSetting } from "@onwei/core";
import { WaitlistHeader } from "@/_components/WaitlistHeader";
import { WaitlistCountdown } from "@/_components/WaitlistCountdown";
import { WaitlistCardScroll } from "@/_components/WaitlistCardScroll";
import { WaitlistForm } from "@/_components/WaitlistForm";
import { WaitlistFooter } from "@/_components/WaitlistFooter";
import { ScrollReveal } from "@/_components/ScrollReveal";
import { SmoothScrollLink } from "@/_components/SmoothScrollLink";

// This page reads launchAt via Prisma, not `fetch`, so Next's automatic
// static/dynamic detection has no signal that it depends on data that
// changes, without this, it gets fully static-generated once and never
// re-rendered, so an admin changing the countdown target on /settings would
// never show up here short of a redeploy. Revalidating every 30s keeps most
// of the caching benefit (not a live DB hit per request) while keeping that
// window roughly in line with getSiteSetting()'s own ~15s in-process cache.
export const revalidate = 30;

// Figma "Coming Soon" screens: draft 3 (web, node 945:4238) and draft 4
// (mobile, node 945:4388). Server component, only the countdown, the
// card-scroll section, and the form are client islands (see each
// component's own file); everything else here ships with zero client JS.
export default async function WaitlistPage() {
  const { launchAt, showCountdown, instagramUrl, youtubeUrl, spotifyUrl } =
    await getSiteSetting();

  return (
    <main className="flex flex-col items-center bg-onwei-beige">
      <WaitlistHeader />

      <section className="w-full max-w-[90rem]">
        <WaitlistCardScroll>
          {/* py-6/gap-4 on mobile (was py-12/gap-[1.875rem], same as desktop),
              this card sits next to the h-[18.75rem] card viewport on mobile;
              the old desktop-sized padding/gaps alone made that too tall. */}
          <div className="flex w-full flex-col justify-between gap-4 rounded-[1.875rem] bg-onwei-purple px-5 py-6 desk:h-[39.6875rem] desk:w-[41.5625rem] desk:gap-[1.875rem] desk:px-14 desk:py-12">
            <div className="relative flex flex-col gap-3 desk:gap-6">
              {/* Figma mobile (node 945:4427) puts this line in normal flow
                  ABOVE the heading, right-aligned, ending right where "Join
                  the Movement" begins, not absolutely offset above the
                  card like desktop's -top-10/right-0 treatment (node
                  945:4241 area). At mobile's tighter py-6 card padding, that
                  desktop offset pushed the text 16px above the card's own
                  top edge, where it was getting cut off/hidden. desk: switches
                  back to the desktop absolute positioning, unaffected by
                  this element now coming first in the DOM since it's taken
                  out of flow at that breakpoint regardless of order. */}
              <p className="text-right font-script text-script-md uppercase leading-[1.2] text-onwei-green desk:absolute desk:-top-10 desk:right-0">
                this is just the warm up
              </p>
              <p className="font-display text-[2rem] font-bold uppercase leading-[1.1] text-onwei-white desk:text-[4rem]">
                Join the{" "}
                <span className="relative inline-block">
                  <Image
                    src="/images/waitlist/hero/movement-circle.svg"
                    alt=""
                    width={300}
                    height={64}
                    aria-hidden
                    className="pointer-events-none absolute -left-[0.875rem] top-[0.0625rem] h-auto w-[calc(100%+1.75rem)] max-w-none desk:-left-[1.125rem] desk:top-[0.125rem] desk:w-[calc(100%+2.25rem)]"
                  />
                  <span className="relative">movement</span>
                </span>
              </p>
              <p className="font-grotesk text-[length:max(0.875rem,11px)] leading-[1.3] text-onwei-white desk:text-[length:max(1.125rem,11px)]">
                Unlock an{" "}
                <span className="font-medium">
                  All Access Onwei Insiders Pass
                </span>{" "}
                for first picks, event access, exclusive offers, and fun
                surprises straight from the founders.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <WaitlistCountdown
                launchAt={launchAt.toISOString()}
                showCountdown={showCountdown}
              />
              {/* SmoothScrollLink (not a plain anchor, not HoverLink) so
                  the click reliably scrolls smoothly to the form, Next's
                  Link doesn't do this on its own for a same-page hash, see
                  that component's comment. Still no new client boundary,
                  already inside WaitlistCardScroll's. */}
              <SmoothScrollLink
                href="#join-onwei-insiders"
                className="flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-[1.25rem] uppercase text-onwei-green desk:text-[1.5rem]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                I want in!
              </SmoothScrollLink>
            </div>
          </div>
        </WaitlistCardScroll>
      </section>

      <section
        id="join-onwei-insiders"
        className="flex w-full max-w-[90rem] flex-col gap-8 px-3 py-6 desk:flex-row desk:items-center desk:justify-between desk:px-11 desk:py-14"
      >
        <ScrollReveal
          as="div"
          className="relative order-2 h-[25rem] w-full overflow-hidden rounded-[1.875rem] desk:order-1 desk:h-[39.6875rem] desk:w-[41.5625rem]"
        >
          <Image
            src="/images/waitlist/photo/hero-photo.png"
            alt=""
            fill
            sizes="((min-width: 768px)) 665px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-[7%] right-[7%] h-[4.5rem] w-[4.875rem]">
            <Image
              src="/images/waitlist/photo/photo-badge.svg"
              alt=""
              fill
              aria-hidden
            />
          </div>
        </ScrollReveal>

        <ScrollReveal
          as="div"
          delay={0.1}
          className="order-1 flex w-full flex-col gap-6 rounded-[1.875rem] px-0 py-6 desk:order-2 desk:w-[41.5625rem] desk:px-14 desk:py-12"
        >
          <div className="flex flex-col gap-3">
            <p className="font-display text-[2.25rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-[3rem]">
              join onwei insiders
            </p>
            <p className="font-grotesk text-[length:max(0.875rem,11px)] leading-[1.3] text-onwei-blue">
              Takes under a minute. You&apos;ll get your card right after.
            </p>
          </div>
          <WaitlistForm />
        </ScrollReveal>
      </section>

      <WaitlistFooter
        instagramUrl={instagramUrl}
        youtubeUrl={youtubeUrl}
        spotifyUrl={spotifyUrl}
      />
    </main>
  );
}
