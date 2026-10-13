import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { MobileNav } from "./MobileNav";

// Figma draws two desktop navs: the Homepage (758:2246) has five links with
// "insiders" as a small tag over "find your wei", every inner page (Collection
// 760:3855, PDP 759:3006) has six links with "About Us" and "insiders" as
// plain items.
const NAV_LINKS = {
  home: [
    { label: "Shop All", href: "/collection/all" },
    { label: "Pickleball", href: "/collection/pickleball" },
    { label: "Pilates", href: "/collection/pilates" },
    { label: "our story", href: "/about" },
    {
      label: "find your wei",
      href: "#",
      // Figma (node 758:2264) pins "insiders" as a small script tag over
      // the top right of this link.
      tag: { label: "insiders", href: "#" },
    },
  ],
  inner: [
    { label: "Shop All", href: "/collection/all" },
    { label: "Pickleball", href: "/collection/pickleball" },
    { label: "Pilates", href: "/collection/pilates" },
    { label: "About Us", href: "/about" },
    { label: "insiders", href: "#" },
    // Figma shows this fifth nav item with no destination screen in the
    // file, no route exists yet, so it is a placeholder anchor.
    { label: "find your wei", href: "#" },
  ],
  // About Us (760:4505): four links, no insiders, and a wordmark logo with
  // "own your effort" beside it (see `aboutVariant` below).
  about: [
    { label: "Shop All", href: "/collection/all" },
    { label: "Pickleball", href: "/collection/pickleball" },
    { label: "Pilates", href: "/collection/pilates" },
    { label: "About Us", href: "/about" },
  ],
} as const;

export type SiteHeaderNav = keyof typeof NAV_LINKS;

// inverted swaps blue and green throughout (used by the About page): blue
// header zone, green announcement bar, green text and icons, with the
// recolored copies of the header SVGs from images/header/inverted.
export function SiteHeader({
  inverted = false,
  nav = "home",
}: {
  inverted?: boolean;
  nav?: SiteHeaderNav;
}) {
  const aboutVariant = nav === "about";
  const dir = inverted ? "/images/header/inverted" : "/images/header";
  const accent = inverted ? "text-onwei-green" : "text-onwei-blue";
  return (
    // bg-onwei-green: matches HeroSection's fix below it, so the top of the
    // page reads as one continuous colored zone instead of a white nav
    // strip butting into a yellow hero. Same caveat: best-effort, not yet
    // re-verified against Figma (API rate-limited).
    <>
      <div
        className={`flex w-full flex-col items-center ${inverted ? "bg-onwei-blue" : "bg-onwei-green"}`}
      >
        <div
          className={`mx-4 mt-3 flex w-full max-w-[85rem] items-center justify-center gap-6 overflow-hidden rounded-[1.25rem] px-6 py-2.5 desk:mx-10 desk:px-14 ${inverted ? "bg-onwei-green" : "bg-onwei-blue"}`}
        >
          <p
            className={`truncate font-display text-[length:max(0.875rem,11px)] font-normal uppercase leading-[normal] ${inverted ? "text-onwei-blue" : "text-onwei-white"} desk:whitespace-nowrap`}
          >
            Free shipping on orders over &#8377;1500
          </p>
          {/* The About Us frame (760:4494) has only the shipping line. */}
          <Image
            src={`${dir}/vector-divider.svg`}
            alt=""
            width={20}
            height={15}
            aria-hidden
            className={`hidden shrink-0 ${aboutVariant ? "" : "desk:block"}`}
          />
          <p
            className={`hidden whitespace-nowrap font-display text-[length:max(0.875rem,11px)] font-normal uppercase leading-[normal] desk:block ${inverted ? "text-onwei-blue" : "text-onwei-white"} ${aboutVariant ? "desk:hidden" : ""}`}
          >
            /on-way/ When you stop waiting to feel ready and just show up
          </p>
        </div>
      </div>

      {/* Only the nav row sticks, the announcement strip above scrolls
          away. A fragment (not one wrapping header) so the sticky range is
          the whole page, not just the header's own box. */}
      <header
        className={`sticky top-0 z-40 flex w-full flex-col items-center ${inverted ? "bg-onwei-blue" : "bg-onwei-green"}`}
      >
        {/* Mobile (node 761:4767): decorative squiggle, logo-as-menu-button
          (see MobileNav.tsx), account/cart icons, no visible link list. */}
        <div className="flex w-full items-center justify-between px-[1.125rem] py-[1.125rem] desk:hidden">
          <Image
            src={`${dir}/icon-mobile-squiggle.svg`}
            alt=""
            width={22}
            height={17}
            aria-hidden
          />
          <MobileNav inverted={inverted} />
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              aria-label="Account"
              className="relative block h-[0.875rem] w-[0.875rem] after:absolute after:-inset-3.5 after:content-['']"
            >
              <Image
                src={`${dir}/icon-user-1.svg`}
                alt=""
                width={8}
                height={8}
                aria-hidden
                className="absolute left-[0.1875rem] top-0"
              />
              <Image
                src={`${dir}/icon-user-2.svg`}
                alt=""
                width={14}
                height={5.5}
                aria-hidden
                className="absolute left-0 top-[0.5312rem]"
              />
            </Link>
            <Link
              href="#"
              aria-label="Cart"
              className="relative block h-[0.8125rem] w-[0.875rem] after:absolute after:-inset-3.5 after:content-['']"
            >
              <Image
                src={`${dir}/icon-cart.svg`}
                alt=""
                fill
                sizes="14px"
                aria-hidden
              />
            </Link>
          </div>
        </div>

        <nav
          aria-label="Primary"
          className="relative hidden w-full items-center justify-center gap-x-6 gap-y-4 px-6 py-6 desk:flex desk:justify-between desk:px-14"
        >
          {aboutVariant ? (
            <>
              {/* Figma 760:4497: the wordmark is two pieces, ON (56x27) and
                  WEI (91x27), 3px apart, with the script tag 12px right. */}
              <Link
                href="/"
                aria-label="Onwei home"
                className="flex shrink-0 items-start gap-[0.1828rem]"
              >
                <Image
                  src="/images/header/wordmark-on.svg"
                  alt="Onwei"
                  width={56}
                  height={27}
                  priority
                />
                <Image
                  src="/images/header/wordmark-wei.svg"
                  alt=""
                  width={91}
                  height={27}
                  aria-hidden
                  priority
                />
              </Link>
              <span
                aria-hidden
                className={`absolute left-[13.625rem] top-[2.6875rem] whitespace-nowrap font-script text-[length:max(0.875rem,11px)] uppercase leading-none ${accent}`}
              >
                own your effort
              </span>
            </>
          ) : (
            <Link href="/" aria-label="Onwei home" className="shrink-0">
              <Image
                src={`${dir}/logo.svg`}
                alt="Onwei"
                width={118}
                height={56}
                priority
              />
            </Link>
          )}

          <ul className="flex flex-wrap items-center justify-center gap-6 desk:gap-14">
            {NAV_LINKS[nav].map((link) => (
              <li key={link.label} className="relative">
                <Link
                  href={link.href}
                  className={`whitespace-nowrap font-grotesk text-label uppercase ${accent}`}
                >
                  {link.label}
                </Link>
                {"tag" in link ? (
                  <Link
                    href={link.tag.href}
                    className={`absolute -top-[0.8938rem] left-[6.025rem] whitespace-nowrap font-script text-[length:max(0.875rem,11px)] uppercase leading-none ${accent}`}
                  >
                    {link.tag.label}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-6">
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                aria-label="Account"
                className="relative block h-[1.125rem] w-[1.125rem]"
              >
                <Image
                  src={`${dir}/icon-user-1.svg`}
                  alt=""
                  width={10}
                  height={10}
                  aria-hidden
                  className="absolute left-[0.25rem] top-0"
                />
                <Image
                  src={`${dir}/icon-user-2.svg`}
                  alt=""
                  width={18}
                  height={7}
                  aria-hidden
                  className="absolute left-0 top-[0.6875rem]"
                />
              </Link>
              <Link
                href="#"
                aria-label="Cart"
                className="relative block h-[1.0625rem] w-[1.125rem]"
              >
                <Image
                  src={`${dir}/icon-cart.svg`}
                  alt=""
                  fill
                  sizes="18px"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
