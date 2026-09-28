import Image from "next/image";
import Link from "next/link";

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
export function WaitlistFooter() {
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
        <div className="relative flex w-full max-w-[1440px] flex-col gap-14 lg:flex-row lg:items-end lg:justify-between lg:gap-24">
          {/* Figma (node 945:4375): left:1149, top:-85, w:210 inside a
              1441px container — i.e. right:82px (not flush with the edge)
              and mostly ABOVE the section's top edge, not hovering next to
              the heading text at mid-height. */}
          <Image
            src="/images/footer/illustration-runner.svg"
            alt=""
            width={210}
            height={342}
            aria-hidden
            className="pointer-events-none absolute -top-[85px] right-[82px] hidden lg:block"
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
                From On &mdash; present, engaged, showing up &mdash; and Wei
                (way) intentional action. Not hustle. Not noise. Just the choice
                to participate.
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
              <a href="#" aria-label="Onwei on Instagram">
                <InstagramIcon />
              </a>
              <a href="#" aria-label="Onwei on YouTube">
                <YoutubeIcon />
              </a>
              <a href="#" aria-label="Onwei on Spotify">
                <SpotifyIcon />
              </a>
            </div>
            <p className="max-w-[510px] font-display text-[14px] uppercase leading-[1.3] text-onwei-beige sm:text-[16px]">
              <span className="font-semibold">ONWEI (n.)</span>
              <br />
              <span className="font-grotesk font-medium normal-case">
                The weight of your own effort. The only thing that&apos;s always
                yours.
                <br />
                The feeling when you stop waiting to feel ready and just show
                up.
                <br />
                Because progress belongs to those who - Show up. Stay on.
              </span>
            </p>
          </div>
        </div>

        {/* Figma has no destination screen for either link yet — "#"
            placeholders, same convention as SiteFooter's Policies column. */}
        <div className="mt-10 flex gap-6 font-grotesk text-[12px] text-onwei-beige lg:hidden">
          <Link href="#" className="underline">
            Terms &amp; Conditions
          </Link>
          <Link href="#" className="underline">
            Privacy Policy
          </Link>
        </div>
        <div className="mt-10 hidden gap-6 font-grotesk text-[12px] text-onwei-beige lg:flex">
          <Link href="#" className="underline">
            Privacy Policy
          </Link>
          <Link href="#" className="underline">
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
