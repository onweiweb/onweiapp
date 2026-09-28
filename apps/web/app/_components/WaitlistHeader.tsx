import Image from "next/image";
import Link from "next/link";

// Figma nodes 945:4239 (web, 945:4241/4245) and 945:4389 (mobile,
// 945:4391/4395) — a minimal header just for /waitlist, not SiteHeader
// (which carries the full nav/cart/account/announcement bar this page
// doesn't have). Web shows the "on-the-way, cause you already are" tagline
// next to the logo; mobile omits it — see root CLAUDE.md's mobile/web
// difference note.
export function WaitlistHeader() {
  return (
    <header className="flex w-full flex-col items-center bg-onwei-green">
      <div className="flex h-[92px] w-full items-center justify-between px-5 py-3 sm:h-auto sm:px-14 sm:py-6">
        <Link
          href="/waitlist"
          aria-label="Onwei home"
          className="flex shrink-0 items-center gap-[13px]"
        >
          <Image
            src="/images/waitlist/header/logo-mark.svg"
            alt=""
            width={56}
            height={27}
            aria-hidden
            priority
          />
          <Image
            src="/images/waitlist/header/logo-wordmark.svg"
            alt="Onwei"
            width={91}
            height={27}
            priority
          />
        </Link>

        <p className="hidden font-script text-script-md uppercase leading-[1.2] text-onwei-blue sm:block">
          on-the-way, cause you already are
        </p>

        <Link
          href="/about"
          className="font-grotesk text-label uppercase text-onwei-blue"
        >
          About Us
        </Link>
      </div>
    </header>
  );
}
