"use client";

import { motion, useReducedMotion } from "motion/react";

const TAGS = {
  div: motion.div,
  section: motion.section,
} as const;

// Shared fade-up-on-scroll-into-view wrapper so this isn't hand-rolled in
// every section on /waitlist and /about. viewport: { once: true } makes it
// a one-shot reveal (no re-trigger scrolling back up); useReducedMotion
// renders the final state immediately instead of animating for users who
// have that OS/browser preference set. `as` picks the rendered tag (default
// div) so wrapping page `<section>`s doesn't lose that landmark semantics.
export function ScrollReveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof typeof TAGS;
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = TAGS[as];
  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </MotionTag>
  );
}
