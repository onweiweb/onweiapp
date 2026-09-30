"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ScrollReveal } from "./ScrollReveal";

const MotionLink = motion.create("a");

// Figma's "Font Awesome 5 Brands" text nodes are a placeholder for icon
// glyphs (see SiteFooter.tsx for the same convention) — real inline icons
// instead, for the three platforms this page actually links (Instagram,
// YouTube, Spotify — different from SiteFooter's Instagram/LinkedIn/
// Facebook set).
function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="currentColor"
      aria-hidden
    >
      <path d="M22 12s0-3.2-.4-4.7a2.9 2.9 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.3a2.9 2.9 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7a2.9 2.9 0 0 0 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.3a2.9 2.9 0 0 0 2-2C22 15.2 22 12 22 12Zm-12 3.2V8.8l5.2 3.2-5.2 3.2Z" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M7 10.2c3.2-.9 6.8-.6 9.4 1" strokeLinecap="round" fill="none" />
      <path
        d="M7.6 13.1c2.6-.7 5.5-.5 7.6.8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M8.2 15.9c2-.5 4.2-.3 5.8.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Figma "Newsletter" frames 945:4349 (web) / 945:4477 (mobile) — a footer
// distinct from SiteFooter's (no nav columns, no "Stay in the loop" form,
// just the brand block + social row + legal links). Legal link ORDER
// differs by breakpoint in Figma: web is Privacy Policy then Terms &
// Conditions, mobile is the reverse — kept as two literal lists rather than
// one reordered with CSS so the DOM/reading order matches each breakpoint.
export function WaitlistFooter({
  instagramUrl,
  youtubeUrl,
  spotifyUrl,
}: {
  instagramUrl: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
}) {
  return (
    // <footer> itself stays bare (block, full width by default) — putting
    // the flex/background classes directly on it instead made it a flex
    // ITEM of <main>'s flex column, which shrink-wraps to content width
    // instead of spanning full width (SiteFooter avoids this the same way:
    // bare <footer>, flex+background on an inner div). Structural
    // row/column switch and the padding scale match SiteFooter's
    // breakpoints (lg, not sm) — this footer's own content is intentionally
    // different from SiteFooter's, but it needs to behave like every other
    // page's footer, not switch to a cramped row layout a full breakpoint
    // earlier than everywhere else.
    // w-full on <footer> itself: WaitlistPage's <main> is a flex column with
    // items-center (not items-stretch, unlike a plain block <main> elsewhere
    // on the site), so a flex ITEM with no explicit width — even a
    // block-level <footer> — shrink-wraps to its content instead of
    // spanning full width. This is why the inner bg/flex wrapper alone
    // wasn't enough.
    <footer className="w-full">
      <div className="flex flex-col items-center bg-onwei-purple px-3 py-12 sm:px-6 lg:px-14">
        <ScrollReveal className="flex w-full flex-col items-center">
          {/* Figma is three independent columns (brand / "let's be friends" /
            illustration), not two flex children spread with justify-between —
            with only two real flex children here, justify-between shoved the
            friends column flush to the right edge, straight under the
            illustration, instead of leaving it at its own fixed position
            with a clear 96px gap after the brand column (Figma: brand ends
            at x:457, friends starts at x:553, in a 1441px frame — that's the
            lg:gap-24 below). items-start (not items-end): Figma has the
            brand block hanging from the row's TOP, not its bottom — it's
            shorter than the friends column (170 vs 233 tall) and starts at
            the same y, not bottom-aligned with it. */}
          <div className="relative flex w-full max-w-[1440px] flex-col gap-14 lg:flex-row lg:items-start lg:gap-24">
            {/* Figma (node 945:4375): left:1149, top:-85, w:210 inside the
              1441px SECTION (945:4350) — not inside this row div, which is
              that section's own content box, itself inset by the section's
              py-12 (48px). So top here has to be -85-48=-133, not -85, or
              the illustration sits 48px lower than Figma and dips into the
              text below it. right:82px doesn't need the same correction —
              this row div's right edge already lines up with the section's
              content-box right edge (no horizontal inset difference).
              Extra -27px beyond that (-160 vs the derived -133) — live
              content reflow (e.g. the "let's be friends" column wrapping to
              more lines than Figma's static mock at some widths) pushes the
              legal links up into the illustration's Figma-derived position;
              this margin absorbs that instead of relying on an exact height
              match that the live page can't guarantee. */}
            <Image
              src="/images/footer/illustration-runner.svg"
              alt=""
              width={210}
              height={342}
              aria-hidden
              className="pointer-events-none absolute -top-[160px] right-[82px] hidden lg:block"
            />
            {/* Mobile equivalent (Figma node 945:4504, inside the mobile
              Newsletter frame 945:4477): much smaller (125x203, vs 210x342
              on desktop) and sits lower, straddling the bottom of the
              "let's be friends" paragraph rather than hanging above the
              section like the desktop one — the paragraph's own max-w is
              narrowed on mobile (below) to leave it room. */}
            <Image
              src="/images/footer/illustration-runner.svg"
              alt=""
              width={125}
              height={203}
              aria-hidden
              className="pointer-events-none absolute top-[360px] right-[25px] block lg:hidden"
            />

            <div className="flex w-full max-w-[401px] flex-col gap-8">
              <div className="relative flex flex-col items-start gap-5">
                <div className="flex items-center gap-5 uppercase text-onwei-beige">
                  <p className="font-display text-[48px] font-bold leading-[0.9] sm:text-[64px]">
                    on&middot;wei
                  </p>
                  <p className="font-display text-[14px] font-semibold sm:text-[16px]">
                    \ on-way \
                  </p>
                </div>
                <p className="font-grotesk text-[14px] leading-[1.3] text-onwei-beige">
                  On - present, engaged, showing up.
                  <br />
                  Wei (way) - intentional action. Not hustle, not noise.
                  <br />
                  Onwei is just the choice to participate.
                </p>
              </div>
              <div className="relative inline-block w-fit">
                <span
                  aria-hidden
                  className="absolute -left-4 -right-4 -top-5 -bottom-5"
                >
                  <Image
                    src="/images/footer/brand-asset-1.png"
                    alt=""
                    fill
                    sizes="420px"
                    className="object-contain"
                  />
                </span>
                <p className="relative z-10 font-display text-[14px] font-semibold uppercase text-onwei-blue sm:text-[16px]">
                  rhymes with &quot;on the way.&quot; because you already are.
                </p>
              </div>
            </div>

            {/* max-w matches Figma's actual column width (two roughly-equal
              flex-1 halves at ~616px each in the 1441px frame) — without a
              cap here, the heading (the widest thing in this column, wider
              than the paragraph's own max-w-[510px] below it) grows past
              where the illustration is positioned and runs into it. */}
            <div className="flex max-w-[600px] flex-col gap-3">
              <p className="font-display text-[36px] font-bold uppercase leading-[0.9] text-onwei-beige sm:text-[48px]">
                Let&apos;s be friends
              </p>
              <div className="flex items-center gap-5 text-onwei-beige">
                {instagramUrl ? (
                  <MotionLink
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Onwei on Instagram"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <InstagramIcon />
                  </MotionLink>
                ) : null}
                {youtubeUrl ? (
                  <MotionLink
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Onwei on YouTube"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <YoutubeIcon />
                  </MotionLink>
                ) : null}
                {spotifyUrl ? (
                  <MotionLink
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Onwei on Spotify"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <SpotifyIcon />
                  </MotionLink>
                ) : null}
              </div>
              {/* max-w-[219px] below lg: Figma's mobile paragraph wraps
                narrower than its 351px column, leaving the right side clear
                for the mobile illustration above to overlap without
                covering text — matches its own Figma text-box width. */}
              <div className="flex max-w-[219px] flex-col gap-2 lg:max-w-[510px]">
                <p className="font-grotesk text-[14px] font-semibold uppercase leading-[1.3] text-onwei-beige">
                  ONWEI (n.)
                </p>
                <ul className="flex flex-col gap-4 font-grotesk text-[14px] leading-[1.3] text-onwei-beige">
                  <li className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current"
                    />
                    <span>
                      The weight of your own effort. The only thing that&apos;s
                      always yours.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current"
                    />
                    <span>
                      The feeling when you stop waiting to feel ready and just
                      show up.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current"
                    />
                    <span>
                      Because progress belongs to those who show up. Stay on.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Figma has no destination screen for either link yet — "#"
            placeholders, same convention as SiteFooter's Policies column.
            Mobile: centered (Figma has near-equal margins either side, x:24.5
            in a 375px frame) — the outer items-center on this section already
            does that for a shrink-wrapped div, so no width/justify needed
            here. Desktop: Figma has this flush against the content's right
            edge (x:1126-1389 of 1441), under the illustration — not centered
            — so it needs its own w-full/max-w to reach that edge and
            justify-end to sit at it, instead of inheriting the mobile
            centering. */}
          <div className="mt-10 flex gap-6 font-grotesk text-[12px] text-onwei-beige lg:hidden">
            <Link href="#" className="underline">
              Terms &amp; Conditions
            </Link>
            <Link href="#" className="underline">
              Privacy Policy
            </Link>
          </div>
          <div className="mt-10 hidden w-full max-w-[1440px] gap-6 font-grotesk text-[12px] text-onwei-beige lg:flex lg:justify-end">
            <Link href="#" className="underline">
              Privacy Policy
            </Link>
            <Link href="#" className="underline">
              Terms &amp; Conditions
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </footer>
  );
}
