import Image from "@/_components/ScaledImage";
import Link from "next/link";
import type { ReactNode } from "react";

// Page frame for the Insider email links. No Figma frame exists for these
// pages; the owner approved (2026-11-09) building them in the style of the
// checkout result frames (TgMpkXMC2QpghHlH6N63oV, 1257:7316): yellow page,
// logo top left with a hairline under the header, navy display headings,
// mono body copy, white rounded cards with a navy border, purple help card.
export function InsiderShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-onwei-green text-onwei-blue">
      <header className="w-full border-b border-onwei-blue">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-5 py-4 desk:px-14 desk:py-5">
          <Link href="/ontheway" aria-label="Onwei home">
            <Image
              src="/images/waitlist/header/logo-lockup.svg"
              alt="Onwei"
              width={150}
              height={27}
              className="h-auto w-[5.25rem] desk:w-[7rem]"
              priority
            />
          </Link>
          <a
            href="mailto:admin@onwei.in"
            className="font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-2"
          >
            Need help? Write to us
          </a>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col gap-6 px-5 py-10 desk:py-16">
        {children}
      </div>
    </main>
  );
}

export function InsiderHelpCard({
  title,
  body,
}: {
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[1.25rem] bg-onwei-purple px-5 py-4 text-onwei-beige">
      <p className="font-display text-[length:max(1rem,13px)] font-bold">
        {title}
      </p>
      <p className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.4]">
        {body}
      </p>
    </div>
  );
}
