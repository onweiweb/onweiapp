"use client";

import { motion, useReducedMotion } from "motion/react";

const TAGS = {
  div: motion.div,
  section: motion.section,
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

// Offsets are rem so the travel scales with the fluid root size.
const VARIANTS = {
  "fade-up": { opacity: 0, y: "1.5rem" },
  fade: { opacity: 0 },
  "scale-in": { opacity: 0, scale: 0.96, y: "0.75rem" },
} as const;

// Shared reveal-on-scroll wrapper so this isn't hand-rolled in every section
// on /ontheway and /about. viewport: { once: true } makes it a one-shot
// reveal (no re-trigger scrolling back up); useReducedMotion renders the
// final state immediately instead of animating for users who have that
// OS/browser preference set. `as` picks the rendered tag (default div) so
// wrapping page `<section>`s doesn't lose that landmark semantics. Only
// opacity and transform animate (compositor-only), so it stays smooth on
// low-end phones. `amount` is a fraction of the element, not a fixed px
// margin, so small screens trigger at the same relative point.
export function ScrollReveal({
  children,
  delay = 0,
  className,
  as = "div",
  variant = "fade-up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof typeof TAGS;
  variant?: keyof typeof VARIANTS;
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = TAGS[as];
  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? false : VARIANTS[variant]}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}
