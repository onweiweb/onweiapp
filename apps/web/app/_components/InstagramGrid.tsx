import Image from "@/_components/ScaledImage";
import { ScrollCarousel } from "./ScrollCarousel";

export interface InstagramGridPhoto {
  url: string;
  altText: string | null;
}

// Extracted from the Homepage's InstagramSection (was page-local), reused
// on Collection/PDP with the same photo set (Figma duplicates this section
// per-page rather than treating it as Homepage-only). The heading text
// itself differs per page in Figma (Homepage: "@OnweiMoves", Collection:
// "@onwei", both confirmed against their own frames, not a typo), so it's
// a prop rather than hardcoded.
// Mobile frame (761:5196): the first two tiles are 307px tall, the rest 295,
// and the first is a touch wider (aspect 360:482).
const MOBILE_TILE_SIZES = [
  "h-[19.1875rem] w-[14.3309rem]",
  "h-[19.1875rem] w-[13.75rem]",
  "h-[18.4375rem] w-[13.75rem]",
] as const;

export function InstagramGrid({
  photos,
  heading = "@OnweiMoves",
  mobileHeading,
  headingClassName = "desk:text-[4.375rem]",
  noteClassName = "desk:left-[calc(50%-30.8438rem)] desk:top-[1.7619rem]",
  arrowClassName = "desk:left-[calc(50%+17.2538rem)] desk:top-[2.475rem]",
}: {
  photos: readonly InstagramGridPhoto[];
  heading?: string;
  // Desktop type size and the script note / arrow positions. The note and
  // arrow are absolute to the heading row, x from its centre line (Figma
  // 758:2522 for the Homepage, 760:4102 for Collection, they differ).
  headingClassName?: string;
  noteClassName?: string;
  arrowClassName?: string;
  // The Homepage mobile frame (761:5195) says "@onwei" where its desktop
  // frame says "@OnweiMoves".
  mobileHeading?: string;
}) {
  return (
    <section className="relative flex flex-col items-center bg-onwei-green px-3 pb-24 pt-[4.5rem] desk:px-14 desk:pb-24 desk:pt-14">
      {/* Mobile frame (node 761:5192): the script note and its curly arrow
          are absolutely placed beside the heading; from desk up they flow
          inline above it as in the desktop frame. */}
      <span
        aria-hidden
        className="absolute left-[10.26%] top-[2.9725rem] whitespace-nowrap font-script text-[1rem] uppercase leading-none text-onwei-blue desk:hidden"
      >
        follow us on instagram
      </span>
      <Image
        src="/images/instagram/arrow-mobile.svg"
        alt=""
        width={35}
        height={38}
        aria-hidden
        className="absolute right-[4.581rem] top-[4.864rem] h-[2.4034rem] w-[2.2073rem] -rotate-[26.52deg] desk:hidden"
      />
      <div className="flex w-full max-w-[90rem] flex-col items-start gap-6 desk:gap-12">
        <div className="relative flex w-full flex-col items-center">
          {/* Desktop: note and arrow hang off the row, positions come in
              as props. Mobile has its own absolute pair above. */}
          <span
            className={`absolute hidden whitespace-nowrap font-script text-script-md uppercase leading-none text-onwei-blue desk:block ${noteClassName}`}
          >
            follow us on instagram
          </span>
          <Image
            src="/images/instagram/arrow.svg"
            alt=""
            width={22}
            height={48}
            aria-hidden
            className={`absolute hidden -rotate-[26.52deg] desk:block ${arrowClassName}`}
          />
          <p
            className={`whitespace-nowrap font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue ${headingClassName}`}
          >
            {mobileHeading ? (
              <>
                <span className="desk:hidden">{mobileHeading}</span>
                <span className="max-desk:hidden">{heading}</span>
              </>
            ) : (
              heading
            )}
          </p>
        </div>
        <ScrollCarousel trackClassName="hidden">
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              className={`relative shrink-0 overflow-hidden rounded-[1.875rem] desk:h-[30.125rem] desk:w-[22.5rem] ${MOBILE_TILE_SIZES[index] ?? MOBILE_TILE_SIZES[2]}`}
            >
              <Image
                src={photo.url}
                alt={photo.altText ?? `Onwei community photo ${index + 1}`}
                fill
                sizes="340px"
                className="object-cover"
              />
            </div>
          ))}
        </ScrollCarousel>
      </div>
    </section>
  );
}
