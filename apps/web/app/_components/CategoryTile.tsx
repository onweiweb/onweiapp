import Image from "next/image";
import Link from "next/link";

// Figma's "Shop" section (node 758:2325) turned out to be a small heading
// plus two quick-link labels ("pickle ball" circled, "yoga mats" plain) —
// not image tiles, despite the section being named "Shop". There's no tile
// artwork to place here; this renders that literal design faithfully while
// still driving hrefs off real category data from listActiveCategories().
export function CategoryTile({
  label,
  href,
  circled = false,
}: {
  label: string;
  href: string;
  circled?: boolean;
}) {
  if (circled) {
    return (
      <Link href={href} className="relative inline-flex items-center px-4 py-2">
        <Image
          src="/images/shop/pill-outline.svg"
          alt=""
          fill
          sizes="160px"
          aria-hidden
          className="pointer-events-none"
        />
        <p className="relative whitespace-nowrap font-display text-[20px] font-medium uppercase text-onwei-blue">
          {label}
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="whitespace-nowrap font-display text-[20px] font-medium uppercase text-onwei-blue"
    >
      {label}
    </Link>
  );
}
