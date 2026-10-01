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

export function SiteHeader() {
  return (
    // bg-onwei-green: matches HeroSection's fix below it, so the top of the
    // page reads as one continuous colored zone instead of a white nav
    // strip butting into a yellow hero. Same caveat: best-effort, not yet
    // re-verified against Figma (API rate-limited).
    <header className="flex flex-col items-center bg-onwei-green">
      <div className="mx-4 mt-3 flex w-full max-w-[85rem] items-center justify-center gap-6 overflow-hidden rounded-[1.25rem] bg-onwei-blue px-6 py-2.5 desk:mx-14 desk:px-14">
        <p className="truncate font-grotesk text-label uppercase text-onwei-white desk:whitespace-nowrap">
          Free shipping on orders over &#8377;1500
        </p>
        <Image
          src="/images/header/vector-divider.svg"
          alt=""
          width={20}
          height={15}
          aria-hidden
          className="hidden shrink-0 desk:block"
        />
        <p className="hidden whitespace-nowrap font-grotesk text-label uppercase text-onwei-white desk:block">
          /on-way/ When you stop waiting to feel ready and just show up
        </p>
      </div>

      {/* Mobile (node 761:4767): decorative squiggle, logo-as-menu-button
          (see MobileNav.tsx), account/cart icons, no visible link list. */}
      <div className="flex w-full items-center justify-between px-[1.125rem] py-[1.125rem] desk:hidden">
        <Image
          src="/images/header/icon-mobile-squiggle.svg"
          alt=""
          width={22}
          height={17}
          aria-hidden
        />
        <MobileNav />
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            aria-label="Account"
            className="relative block h-[0.875rem] w-[0.875rem] after:absolute after:-inset-3.5 after:content-['']"
          >
            <Image
              src="/images/header/icon-user-1.svg"
              alt=""
              width={8}
              height={8}
              aria-hidden
              className="absolute left-[0.1875rem] top-0"
            />
            <Image
              src="/images/header/icon-user-2.svg"
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
              src="/images/header/icon-cart.svg"
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
            src="/images/header/logo.svg"
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
                className="whitespace-nowrap font-grotesk text-label uppercase text-onwei-blue"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-6">
          <Link
            href="#"
            className="font-script text-script-md uppercase leading-none text-onwei-blue"
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
                src="/images/header/icon-user-1.svg"
                alt=""
                width={10}
                height={10}
                aria-hidden
                className="absolute left-[0.25rem] top-0"
              />
              <Image
                src="/images/header/icon-user-2.svg"
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
                src="/images/header/icon-cart.svg"
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
  );
}
