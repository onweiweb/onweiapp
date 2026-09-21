import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Shop All", href: "/collection/all" },
  { label: "Pickleball", href: "/collection/pickleball" },
  { label: "Pilates", href: "/collection/pilates" },
  { label: "our story", href: "/about" },
  // Figma shows this as a fifth nav item with no destination screen in the
  // file — no route exists yet, so it's a placeholder anchor.
  { label: "find your wei", href: "#" },
] as const;

export function SiteHeader() {
  return (
    // bg-onwei-green: matches HeroSection's fix below it, so the top of the
    // page reads as one continuous colored zone instead of a white nav
    // strip butting into a yellow hero. Same caveat: best-effort, not yet
    // re-verified against Figma (API rate-limited).
    <header className="flex flex-col items-center bg-onwei-green">
      <div className="mx-4 mt-3 flex w-full max-w-[1360px] items-center justify-center gap-6 overflow-hidden rounded-[20px] bg-onwei-blue px-6 py-2.5 sm:mx-14 sm:px-14">
        <p className="truncate font-grotesk text-label uppercase text-onwei-white sm:whitespace-nowrap">
          Free shipping on orders over &#8377;1500
        </p>
        <Image
          src="/images/header/vector-divider.svg"
          alt=""
          width={20}
          height={15}
          aria-hidden
          className="hidden shrink-0 sm:block"
        />
        <p className="hidden whitespace-nowrap font-grotesk text-label uppercase text-onwei-white sm:block">
          /on-way/ When you stop waiting to feel ready and just show up
        </p>
      </div>

      <nav
        aria-label="Primary"
        className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-4 px-6 py-6 sm:justify-between sm:px-14"
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

        <ul className="order-3 flex flex-wrap items-center justify-center gap-6 sm:order-none md:gap-14">
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
              className="relative block h-[18px] w-[18px]"
            >
              <Image
                src="/images/header/icon-user-1.svg"
                alt=""
                width={10}
                height={10}
                aria-hidden
                className="absolute left-[4px] top-0"
              />
              <Image
                src="/images/header/icon-user-2.svg"
                alt=""
                width={18}
                height={7}
                aria-hidden
                className="absolute left-0 top-[11px]"
              />
            </Link>
            <Link
              href="#"
              aria-label="Cart"
              className="relative block h-[17px] w-[18px]"
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
