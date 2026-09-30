"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";

const MotionLink = motion.create(Link);

// next/link doesn't reliably trigger the browser's native anchor-scroll for
// a same-page #hash href, confirmed by testing: clicking did nothing at
// all, even with `scroll-behavior: smooth` set globally on <html> (that CSS
// only ever fires if the browser's own hash-jump runs, and Link's router
// intercepts the click before that happens). This does the scroll itself
// instead of relying on Link's default navigation.
export function SmoothScrollLink({
  href,
  onClick,
  ...props
}: Omit<HTMLMotionProps<"a">, "href"> & { href: `#${string}` }) {
  return (
    <MotionLink
      href={href}
      onClick={(event) => {
        const target = document.getElementById(href.slice(1));
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
