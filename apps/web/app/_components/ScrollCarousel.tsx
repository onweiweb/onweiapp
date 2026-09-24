"use client";

import { useRef, useState } from "react";

// Figma (node 758:2445 "Frame 2085661414" / "Rectangle 73") shows a thin
// progress track under horizontally-scrolling rows — a real scrollbar
// replacement, not decoration. A static bar looks broken the moment someone
// actually scrolls, so this tracks real scroll position. Originally built
// for the Homepage's reviews wall, now the shared scroll affordance for
// every horizontally-scrolling row site-wide (reviews, Instagram grid,
// mobile product/journal carousels) rather than each duplicating it.
const THUMB_WIDTH_PERCENT = 20;

export function ScrollCarousel({
  children,
  gap = "gap-4",
  className = "",
  trackClassName = "",
  wrapperClassName = "w-full",
}: {
  children: React.ReactNode;
  gap?: string;
  className?: string;
  trackClassName?: string;
  wrapperClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  }

  return (
    <div className={`flex flex-col items-center gap-6 ${wrapperClassName}`}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={`no-scrollbar flex w-full ${gap} overflow-x-auto ${className}`}
      >
        {children}
      </div>
      <div
        className={`h-0.5 w-full max-w-[1344px] rounded-full bg-onwei-blue/20 ${trackClassName}`}
      >
        <div
          className="h-0.5 rounded-full bg-onwei-blue"
          style={{
            width: `${THUMB_WIDTH_PERCENT}%`,
            marginLeft: `${progress * (100 - THUMB_WIDTH_PERCENT)}%`,
          }}
        />
      </div>
    </div>
  );
}
