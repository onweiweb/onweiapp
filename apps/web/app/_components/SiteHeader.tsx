import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { MobileNav } from "./MobileNav";

const NAV_LINKS = [
  { label: "Shop All", href: "/collection/all" },
  { label: "Pickleball", href: "/collection/pickleball" },
  { label: "Pilates", href: "/collection/pilates" },
  { label: "our story", href: "/about" },
  // Figma shows this as a fifth nav item with no destination screen in the
  // file, no route exists yet, so it's a placeholder anchor.
  { label: "find your wei", href: "#" },
] as const;

// inverted swaps blue and green throughout (used by the About page): blue
// header zone, green announcement bar, green text and icons, with the
// recolored copies of the header SVGs from images/header/inverted.
export function SiteHeader({ inverted = false }: { inverted?: boolean }) {
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
          className={`mx-4 mt-3 flex w-full max-w-[85rem] items-center justify-center gap-6 overflow-hidden rounded-[1.25rem] px-6 py-2.5 desk:mx-14 desk:px-14 ${inverted ? "bg-onwei-green" : "bg-onwei-blue"}`}
        >
          <p
            className={`truncate font-grotesk text-label uppercase ${inverted ? "text-onwei-blue" : "text-onwei-white"} desk:whitespace-nowrap`}
          >
            Free shipping on orders over &#8377;1500
          </p>
          <Image
            src={`${dir}/vector-divider.svg`}
            alt=""
            width={20}
            height={15}
            aria-hidden
            className="hidden shrink-0 desk:block"
          />
          <p
            className={`hidden whitespace-nowrap font-grotesk text-label uppercase desk:block ${inverted ? "text-onwei-blue" : "text-onwei-white"}`}
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
          className="hidden w-full items-center justify-center gap-x-6 gap-y-4 px-6 py-6 desk:flex desk:justify-between desk:px-14"
        >
          <Link href="/" aria-label="Onwei home" className="shrink-0">
            <Image
              src={`${dir}/logo.svg`}
              alt="Onwei"
              width={118}
              height={56}
              priority
            />
          </Link>

          <ul className="flex flex-wrap items-center justify-center gap-6 desk:gap-14">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={`whitespace-nowrap font-grotesk text-label uppercase ${accent}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-6">
            <Link
              href="#"
              className={`font-script text-script-md uppercase leading-none ${accent}`}
            >
              insiders
            </Link>
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
