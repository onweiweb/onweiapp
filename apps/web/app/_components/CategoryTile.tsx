import Image from "@/_components/ScaledImage";
import Link from "next/link";

// Figma's "Shop" section (node 758:2325) turned out to be a small heading
// plus two quick-link labels ("pickle ball" circled, "yoga mats" plain),
// not image tiles, despite the section being named "Shop". There's no tile
// artwork to place here; this renders that literal design faithfully while
// still driving hrefs off real category data from listActiveCategories().
export function CategoryTile({
  label,
  href,
  circled = false,
  mobileLabel,
}: {
  label: string;
  href: string;
  circled?: boolean;
  // Figma's mobile frame (node 761:4880) spells it "pickleball" and
  // underlines it instead of drawing the oval.
  mobileLabel?: string;
}) {
  if (circled) {
    return (
      <Link
        href={href}
        className="relative inline-flex flex-col items-center desk:flex-row desk:px-4 desk:py-2"
      >
        <Image
          src="/images/shop/pill-outline.svg"
          alt=""
          fill
          sizes="160px"
          aria-hidden
          className="pointer-events-none max-desk:hidden"
        />
        <p className="relative whitespace-nowrap font-display text-[1.125rem] font-medium uppercase text-onwei-blue desk:text-[1.25rem]">
          <span className={mobileLabel ? "max-desk:hidden" : undefined}>
            {label}
          </span>
          {mobileLabel ? (
            <span className="desk:hidden">{mobileLabel}</span>
          ) : null}
        </p>
        <Image
          src="/images/shop/underline-mobile.svg"
          alt=""
          width={93}
          height={2}
          aria-hidden
          className="pointer-events-none h-[0.1369rem] w-[5.82rem] desk:hidden"
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="whitespace-nowrap font-display text-[1.125rem] font-medium uppercase text-onwei-blue desk:text-[1.25rem]"
    >
      {label}
    </Link>
  );
}
