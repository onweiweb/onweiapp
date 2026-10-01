"use client";

import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { HoverLink } from "./HoverLink";

// Figma nodes 945:4239 (web, logo lockup 945:4241) and 945:4389 (mobile,
// 945:4391), a minimal header just for /waitlist, not SiteHeader (which
// carries the full nav/cart/account/announcement bar this page doesn't
// have). Web shows the "on-the-way, cause you already are" tagline next to
// the logo; mobile omits it, see root CLAUDE.md's mobile/web difference
// note. The logo is exported as one combined SVG (logo-lockup.svg, node
// 945:4241), not separate mark+wordmark images with a flex gap between
// them - Figma's O/N and WEI groups sit ~2.8px apart with letterform-level
// kerning, not a clean 13px gap, so two images side by side always read as
// "ON  WEI" instead of the tightly-joined "ONWEI" wordmark.
//
// "use client" + a mount fade so this header (shared by /waitlist and
// /about in waitlist mode) gives both pages a consistent "arriving" feel
// on load/navigation, the practical stand-in for a full cross-page
// transition, which would need an AnimatePresence in a layout shared by
// both routes (they're sibling top-level routes with none today).
export function WaitlistHeader({
  navHref = "/about",
  navLabel = "About Us",
}: {
  navHref?: string;
  navLabel?: string;
} = {}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="flex w-full flex-col items-center bg-onwei-green"
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex h-[5.75rem] w-full items-center justify-between px-5 py-3 desk:h-auto desk:px-14 desk:py-6">
        <Link
          href="/ontheway"
          aria-label="Onwei home"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/images/waitlist/header/logo-lockup.svg"
            alt="Onwei"
            width={150}
            height={27}
            priority
          />
        </Link>

        <p className="hidden font-script text-script-md uppercase leading-[1.2] text-onwei-blue desk:block">
          on-the-way, cause you already are
        </p>

        <HoverLink
          href={navHref}
          className="font-grotesk text-label uppercase text-onwei-blue"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          {navLabel}
        </HoverLink>
      </div>
    </motion.header>
  );
}
