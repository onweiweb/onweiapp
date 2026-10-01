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
export function InstagramGrid({
  photos,
  heading = "@OnweiMoves",
}: {
  photos: readonly InstagramGridPhoto[];
  heading?: string;
}) {
  return (
    <section className="relative flex flex-col items-center bg-onwei-green px-3 pb-24 pt-[4.5rem] desk:px-14 desk:py-24">
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
        <div className="relative flex w-full flex-col items-center gap-3">
          <span className="relative hidden items-center gap-2 font-script text-script-md uppercase text-onwei-blue desk:flex">
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
          <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-[4.375rem]">
            {heading}
          </p>
        </div>
        <ScrollCarousel>
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              className="relative h-[18.4375rem] w-[13.75rem] shrink-0 overflow-hidden rounded-[1.875rem] desk:h-[26.25rem] desk:w-[21.25rem]"
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
