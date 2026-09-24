import Image from "next/image";

// Figma's Collection frame mixes a lifestyle photo tile into each category's
// product grid — 375px wide (wider than a 282px ProductCard) with a hand-
// drawn character illustration overlaid, positioned differently per row
// (node 760:3940 hangs off the bottom-right of the Pickleball tile; node
// 760:3963 sits near the top-left of the Pilates tile) rather than a fixed
// spot, so callers pass their own overlay positioning.
export function PromoTile({
  photo,
  photoAlt,
  illustration,
  illustrationAlt = "",
  illustrationWidth,
  illustrationHeight,
  illustrationClassName,
}: {
  photo: string;
  photoAlt: string;
  illustration: string;
  illustrationAlt?: string;
  illustrationWidth: number;
  illustrationHeight: number;
  illustrationClassName: string;
}) {
  return (
    <div className="relative w-[375px] shrink-0 max-w-[375px]">
      <div className="relative aspect-[375/454] w-full overflow-hidden rounded-[30px]">
        {/* Sits inside a horizontally-scrolling row, often past the
            initial viewport width. next/image's default lazy loading uses
            an IntersectionObserver against the browser viewport, which
            never fires for an element positioned off-screen to the right —
            so the photo only loaded once the user scrolled it into view.
            loading="eager" opts it out of that. */}
        <Image
          src={photo}
          alt={photoAlt}
          fill
          sizes="375px"
          loading="eager"
          className="object-cover"
        />
      </div>
      <Image
        src={illustration}
        alt={illustrationAlt}
        width={illustrationWidth}
        height={illustrationHeight}
        aria-hidden
        loading="eager"
        className={`pointer-events-none absolute hidden lg:block ${illustrationClassName}`}
      />
    </div>
  );
}
