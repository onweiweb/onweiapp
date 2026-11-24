import Image from "@/_components/ScaledImage";

// The hand-drawn circle from the Collection frame (Figma 760:3874 around
// "all" in the hero, 760:4210 around the active category tab). It stretches
// to whatever word it wraps (the SVGs use preserveAspectRatio="none"), so
// Shop All, Pickleball and Pilates all get it. Insets are in em, so it scales
// with the text. Measured from the Shop All placements in Figma.
const VARIANTS = {
  heading: {
    src: "/images/collection/oval-all.svg",
    inset: "-left-[0.26em] -right-[0.26em] -top-[0.05em] -bottom-[0.03em]",
  },
  tab: {
    src: "/images/collection/oval-shop-all.svg",
    inset: "-left-[0.8em] -right-[0.8em] -top-[0.6em] -bottom-[0.45em]",
  },
} as const;

export function HandDrawnOval({
  variant,
  children,
}: {
  variant: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  const { src, inset } = VARIANTS[variant];
  return (
    <span className="relative inline-block">
      <span aria-hidden className={`pointer-events-none absolute ${inset}`}>
        <Image src={src} alt="" fill sizes="20rem" />
      </span>
      <span className="relative">{children}</span>
    </span>
  );
}
