"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// Figma's mobile header (node 761:4767) has no menu affordance at all — no
// hamburger, no drawer state anywhere in the file, just logo + a decorative
// squiggle + account/cart icons. A real mobile visitor still needs a way to
// reach Shop/Pickleball/Pilates/etc., so per explicit approval this makes
// the logo itself the menu trigger, opening a panel that drops down from
// it — an intentional addition, not something copied from a Figma state.
const NAV_LINKS = [
  { label: "Shop All", href: "/collection/all" },
  { label: "Pickleball", href: "/collection/pickleball" },
  { label: "Pilates", href: "/collection/pilates" },
  { label: "our story", href: "/about" },
  { label: "find your wei", href: "#" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="block"
      >
        <Image
          src="/images/header/logo.svg"
          alt="Onwei"
          width={72}
          height={34}
          priority
        />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+12px)] z-20 flex w-[240px] flex-col items-center gap-4 rounded-[20px] bg-onwei-blue px-6 py-6 shadow-lg">
          <ul className="flex flex-col items-center gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="whitespace-nowrap font-grotesk text-label uppercase text-onwei-beige"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="#"
            onClick={() => setOpen(false)}
            className="font-script text-script-md uppercase leading-none text-onwei-green"
          >
            insiders
          </Link>
        </div>
      ) : null}
    </div>
  );
}
