import Image from "@/_components/ScaledImage";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/_components/SiteFooter";

// Frame of the checkout result pages in Figma (TgMpkXMC2QpghHlH6N63oV,
// 1257:7316 / 7520 / 7695): yellow page, logo top left with a hairline
// under the header, "Need help? Contact us" top right, the "Move with Onwei"
// footer. Checkout itself and the account pages use the same frame (no
// Figma, approved to follow this style).
export function CheckoutShell({
  children,
  wide = true,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-onwei-green text-onwei-blue">
      <header className="w-full border-b border-onwei-blue">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-5 py-4 desk:px-14 desk:py-5">
          <Link href="/" aria-label="Onwei home">
            <Image
              src="/images/header/logo.svg"
              alt="Onwei"
              width={118}
              height={56}
              className="h-auto w-[4.5rem] desk:w-[5.75rem]"
              priority
            />
          </Link>
          <a
            href="mailto:admin@onwei.in"
            className="font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-2"
          >
            Need help? Contact us
          </a>
        </div>
      </header>
      <div
        className={`mx-auto w-full flex-1 px-5 py-10 desk:px-14 desk:py-14 ${wide ? "max-w-[90rem]" : "max-w-[44rem]"}`}
      >
        {children}
      </div>
      <SiteFooter desktopHeading={["Move with", "Onwei"]} />
    </main>
  );
}

export { Card, CheckoutSteps, HelpCard } from "./parts";
