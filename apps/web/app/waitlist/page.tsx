import Image from "next/image";
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
// changes — without this, it gets fully static-generated once and never
// re-rendered, so an admin changing the countdown target on /settings would
// never show up here short of a redeploy. Revalidating every 30s keeps most
// of the caching benefit (not a live DB hit per request) while keeping that
// window roughly in line with getSiteSetting()'s own ~15s in-process cache.
export const revalidate = 30;

// Figma "Coming Soon" screens: draft 3 (web, node 945:4238) and draft 4
// (mobile, node 945:4388). Server component — only the countdown, the
// card-scroll section, and the form are client islands (see each
// component's own file); everything else here ships with zero client JS.
export default async function WaitlistPage() {
  const { launchAt, instagramUrl, youtubeUrl, spotifyUrl } =
    await getSiteSetting();

  return (
    <main className="flex flex-col items-center bg-onwei-beige">
      <WaitlistHeader />

      <section className="w-full max-w-[1440px]">
        <WaitlistCardScroll>
          {/* py-6/gap-4 on mobile (was py-12/gap-[30px], same as desktop) —
              this card sits next to the h-[300px] card viewport on mobile;
              the old desktop-sized padding/gaps alone made that too tall. */}
          <div className="flex w-full flex-col justify-between gap-4 rounded-[30px] bg-onwei-purple px-5 py-6 sm:h-[635px] sm:w-[665px] sm:gap-[30px] sm:px-14 sm:py-12">
            <div className="relative flex flex-col gap-3 sm:gap-6">
              {/* Figma mobile (node 945:4427) puts this line in normal flow
                  ABOVE the heading, right-aligned, ending right where "Join
                  the Movement" begins — not absolutely offset above the
                  card like desktop's -top-10/right-0 treatment (node
                  945:4241 area). At mobile's tighter py-6 card padding, that
                  desktop offset pushed the text 16px above the card's own
                  top edge, where it was getting cut off/hidden. sm: switches
                  back to the desktop absolute positioning, unaffected by
                  this element now coming first in the DOM since it's taken
                  out of flow at that breakpoint regardless of order. */}
              <p className="text-right font-script text-script-md uppercase leading-[1.2] text-onwei-green sm:absolute sm:-top-10 sm:right-0">
                this is just the warm up
              </p>
              <p className="font-display text-[32px] font-bold uppercase leading-[1.1] text-onwei-white sm:text-[64px]">
                Join the{" "}
                <span className="relative inline-block">
                  <Image
                    src="/images/waitlist/hero/movement-circle.svg"
                    alt=""
                    width={300}
                    height={64}
                    aria-hidden
                    className="pointer-events-none absolute -left-[14px] top-[1px] h-auto w-[calc(100%+28px)] max-w-none sm:-left-[18px] sm:top-[2px] sm:w-[calc(100%+36px)]"
                  />
                  <span className="relative">movement</span>
                </span>
              </p>
              <p className="font-grotesk text-[14px] leading-[1.3] text-onwei-white sm:text-[18px]">
                Unlock an{" "}
                <span className="font-medium">
                  All Access Onwei Insiders Pass
                </span>{" "}
                for first picks, event access, exclusive offers, and fun
                surprises straight from the founders.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <WaitlistCountdown launchAt={launchAt.toISOString()} />
              {/* SmoothScrollLink (not a plain anchor, not HoverLink) so
                  the click reliably scrolls smoothly to the form — Next's
                  Link doesn't do this on its own for a same-page hash, see
                  that component's comment. Still no new client boundary,
                  already inside WaitlistCardScroll's. */}
              <SmoothScrollLink
                href="#join-onwei-insiders"
                className="flex w-full items-center justify-center rounded-[30px] bg-onwei-blue px-6 py-3 font-grotesk text-[20px] uppercase text-onwei-green sm:text-[24px]"
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
        className="flex w-full max-w-[1440px] flex-col gap-8 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-11 sm:py-14"
      >
        <ScrollReveal
          as="div"
          className="relative order-2 h-[400px] w-full overflow-hidden rounded-[30px] sm:order-1 sm:h-[635px] sm:w-[665px]"
        >
          <Image
            src="/images/waitlist/photo/hero-photo.png"
            alt=""
            fill
            sizes="(min-width: 640px) 665px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-[7%] right-[7%] h-[72px] w-[78px]">
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
          className="order-1 flex w-full flex-col gap-6 rounded-[30px] px-0 py-6 sm:order-2 sm:w-[665px] sm:px-14 sm:py-12"
        >
          <div className="flex flex-col gap-3">
            <p className="font-display text-[36px] font-bold uppercase leading-[0.9] text-onwei-blue sm:text-[48px]">
              join onwei insiders
            </p>
            <p className="font-grotesk text-[14px] leading-[1.3] text-onwei-blue">
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
