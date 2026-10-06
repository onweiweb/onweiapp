"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Cut at the last word boundary at or before `limit` characters, so the
// collapsed text never ends mid-word.
export function truncateAtWord(text: string, limit: number) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// Bio copy with a mobile-only "Read more". Desktop (desk:) always shows the
// full text and hides the toggle in CSS, so there is no JS breakpoint check
// and no hydration mismatch. On mobile the collapsed view shows the first
// `limit` characters (across paragraphs); expanding animates the height open
// and fades the new text in. The full text is always in the DOM (the
// collapsed copy is a visual duplicate hidden from assistive tech) so
// crawlers and screen readers get everything.
export function ExpandableBio({
  paragraphs,
  limit = 465,
  className,
}: {
  paragraphs: string[];
  limit?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Stays true while the close animation runs so the full text is not
  // swapped for the short copy until the height has finished shrinking.
  const [showFull, setShowFull] = useState(false);
  const [heights, setHeights] = useState<{
    short: number;
    full: number;
  } | null>(null);
  const reduceMotion = useReducedMotion();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const shortRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);

  const needsToggle = paragraphs.join("\n\n").length > limit;

  // Collapsed paragraphs: whole paragraphs while they fit, then the cut one.
  const collapsed: string[] = [];
  let used = 0;
  for (const paragraph of paragraphs) {
    const remaining = limit - used;
    if (remaining <= 0) break;
    if (paragraph.length <= remaining) {
      collapsed.push(paragraph);
      used += paragraph.length;
    } else {
      collapsed.push(truncateAtWord(paragraph, remaining));
      break;
    }
  }

  // Two invisible copies measure the collapsed and expanded heights at the
  // current width, so the visible box can animate between real pixel values
  // (height: auto cannot be animated to or from).
  useEffect(() => {
    const short = shortRef.current;
    const full = fullRef.current;
    if (!short || !full) return;
    const measure = () =>
      setHeights({ short: short.offsetHeight, full: full.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(short);
    observer.observe(full);
    return () => observer.disconnect();
  }, [needsToggle]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      if (reduceMotion) setShowFull(false);
      rootRef.current?.scrollIntoView({
        block: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    } else {
      setShowFull(true);
      setOpen(true);
    }
  };

  const textClass = "flex flex-col gap-[1.3em]";

  return (
    <div ref={rootRef} className={className}>
      {/* Desktop: full text, always. */}
      <div className={`${textClass} max-desk:hidden`}>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {/* Mobile */}
      <div className="desk:hidden">
        {needsToggle ? (
          <>
            <div className="relative">
              <div
                ref={shortRef}
                aria-hidden
                className={`${textClass} pointer-events-none invisible absolute inset-x-0 top-0`}
              >
                {collapsed.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              <div
                ref={fullRef}
                aria-hidden
                className={`${textClass} pointer-events-none invisible absolute inset-x-0 top-0`}
              >
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <motion.div
                id={id}
                initial={false}
                animate={
                  heights
                    ? { height: open ? heights.full : heights.short }
                    : undefined
                }
                transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                onAnimationComplete={() => {
                  if (!open) setShowFull(false);
                }}
                className={`${textClass} overflow-hidden`}
              >
                {(showFull ? paragraphs : collapsed).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </motion.div>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls={id}
              className="mx-auto mt-4 block w-fit rounded-[1.875rem] bg-onwei-beige px-6 py-3 font-grotesk text-[length:max(0.875rem,11px)] uppercase text-onwei-blue transition-transform active:scale-[0.97]"
            >
              {open ? "Read less" : "Read more"}
            </button>
          </>
        ) : (
          <div className={textClass}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
