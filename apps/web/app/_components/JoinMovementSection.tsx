import Image from "@/_components/ScaledImage";
import { CtaLink } from "./CtaLink";

// Extracted from the Homepage (was page-local), Figma repeats this exact
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
    <section className="flex items-end justify-center bg-onwei-green px-3 pb-14 pt-[4.5rem] desk:px-[7.5rem] desk:py-14">
      <div className="relative flex w-full max-w-[90rem] items-end justify-center gap-2.5">
        {/* Straddles the section boundary in Figma, half the illustration
          sits in the white space above this section, not fully inside it.
          Mobile (node 761:5119) pins it top right of the heading instead. */}
        <Image
          src="/images/about2/illustration.svg"
          alt=""
          width={205}
          height={202}
          aria-hidden
          className="pointer-events-none absolute left-[60.9%] top-[-7.546rem] h-[8.5rem] w-[8.625rem] desk:left-auto desk:right-[38%] desk:-top-24 desk:h-auto desk:w-[12.8125rem]"
        />
        <div className="flex w-full flex-col items-center justify-between gap-6 desk:flex-row desk:items-start desk:gap-8">
          <p className="w-[12.9375rem] text-center font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:w-auto desk:max-w-[36.125rem] desk:text-left desk:text-[4.375rem]">
            Join the Movement
          </p>
          <div className="relative flex flex-col items-center gap-6 desk:items-start">
            <div className="relative">
              <p className="max-w-[22.25rem] text-center font-grotesk text-[length:max(0.875rem,11px)] text-onwei-blue desk:max-w-[30.25rem] desk:text-left">
                Movement events, community sessions, early access, product
                testing, and exclusive rewards - and a say in what we build
                next!
              </p>
              <Image
                src="/images/about2/underline.svg"
                alt=""
                width={285}
                height={2}
                aria-hidden
                className="pointer-events-none absolute left-[calc(50%-8.9rem)] top-full w-[17.8125rem] max-w-none desk:hidden"
              />
            </div>
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
              className="pointer-events-none absolute -left-1 top-[3.25rem] hidden w-[17.8125rem] max-w-none desk:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
