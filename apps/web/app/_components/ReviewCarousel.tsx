"use client";

import { useRef, useState } from "react";

// Figma (node 758:2445 "Frame 2085661414" / "Rectangle 73") shows a thin
// progress track under the review cards — a real scrollbar replacement,
// not decoration. A static bar (the earlier implementation) looks broken
// the moment someone actually scrolls, so this tracks real scroll position.
const THUMB_WIDTH_PERCENT = 20;

export function ReviewCarousel({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full gap-4 overflow-x-auto"
      >
        {children}
      </div>
      <div className="h-0.5 w-full max-w-[1344px] rounded-full bg-onwei-blue/20">
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
