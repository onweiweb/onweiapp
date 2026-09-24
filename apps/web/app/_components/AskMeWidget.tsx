"use client";

import Image from "next/image";
import type { FaqItem } from "@onwei/core";
import { OPEN_ACCORDION_ITEM_EVENT } from "./Accordion";
import { ScrollCarousel } from "./ScrollCarousel";

// Figma PDP info panel (frame "PDP_draft 2", node 759:3102 "FAQ") — a
// purple "have questions?" teaser sitting right after the accordion, with
// suggested-question chips. Confirmed behavior: this is a scroll-link, not
// a live search — clicking a chip scrolls to and expands the matching
// entry in FaqSection further down the page (no new backend). Sourced from
// the same `faqs` the page already fetches via listFaqs, not hardcoded
// copy — the input itself has no real search behind it, so it's decorative
// framing rather than a functional field.
export function AskMeWidget({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;
  const suggested = faqs.slice(0, 2);

  return (
    <div className="flex w-full flex-col gap-6 rounded-[30px] bg-onwei-purple px-6 py-6 sm:px-8">
      <div className="flex w-full items-center justify-between gap-4 rounded-[30px] bg-onwei-beige px-6 py-4">
        <p className="font-grotesk text-[14px] uppercase text-onwei-blue">
          Have questions? Ask me!
        </p>
        <Image
          src="/images/faq/icon-send.svg"
          alt=""
          width={18}
          height={18}
          aria-hidden
        />
      </div>

      <ScrollCarousel>
        {suggested.map((faq) => (
          <button
            key={faq.id}
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent(OPEN_ACCORDION_ITEM_EVENT, {
                  detail: { id: `faq-${faq.id}` },
                }),
              )
            }
            className="shrink-0 whitespace-nowrap rounded-[30px] bg-onwei-beige px-6 py-3 text-left font-grotesk text-[14px] text-onwei-blue"
          >
            {faq.question}
          </button>
        ))}
      </ScrollCarousel>
    </div>
  );
}
