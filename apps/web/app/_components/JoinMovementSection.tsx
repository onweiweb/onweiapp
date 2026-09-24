import Image from "next/image";
import { CtaLink } from "./CtaLink";

// Extracted from the Homepage (was page-local) — Figma repeats this exact
// section (same heading, body copy, illustration, underline) on the
// Collection page too, only the button label differs there ("Move With
// Onwei" vs Homepage's "Find Your Wei").
export function JoinMovementSection({
  buttonLabel = "Find Your Wei",
  buttonHref = "#",
}: {
  buttonLabel?: string;
  buttonHref?: string;
}) {
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
            <CtaLink
              href={buttonHref}
              className="bg-onwei-blue text-onwei-beige"
            >
              {buttonLabel}
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
