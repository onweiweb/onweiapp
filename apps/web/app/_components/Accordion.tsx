"use client";

import { useEffect, useState } from "react";

// The "Ask me" FAQ teaser (AskMeWidget, on the PDP) opens a specific FAQ
// entry further down the page from a click above it — a custom window
// event rather than a URL hash, so it doesn't fight FaqSection's own
// existing "ask a question" link (href="/#faqs").
export const OPEN_ACCORDION_ITEM_EVENT = "onwei:open-accordion-item";

// No accordion existed anywhere in this codebase (confirmed via grep) — the
// expand/collapse shape (useState + aria-expanded + conditional render) is
// modeled on MobileNav.tsx, the only precedent, styled for the PDP's
// DESCRIPTION/MATERIALS & CARE/SHIPPING sections (Figma frame 759:2979,
// node 759:3090 "ACCORDIONS") instead of a nav panel.
export function AccordionItem({
  id,
  title,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!id) return;
    function handleOpenRequest(event: Event) {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== id) return;
      setOpen(true);
      document
        .getElementById(id!)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.addEventListener(OPEN_ACCORDION_ITEM_EVENT, handleOpenRequest);
    return () =>
      window.removeEventListener(OPEN_ACCORDION_ITEM_EVENT, handleOpenRequest);
  }, [id]);

  return (
    <div id={id} className="border-b border-onwei-blue py-5 first:border-t">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="font-display text-[16px] font-medium text-onwei-blue">
          {title}
        </span>
        <span
          aria-hidden
          className="relative h-[14px] w-[14px] shrink-0 text-onwei-blue"
        >
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
          <span
            className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-opacity ${open ? "opacity-0" : "opacity-100"}`}
          />
        </span>
      </button>
      {open ? (
        <div className="pt-4 font-grotesk text-[14px] leading-normal text-onwei-blue">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Accordion({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col">{children}</div>;
}
