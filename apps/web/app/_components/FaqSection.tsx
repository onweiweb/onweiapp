import type { FaqItem } from "@onwei/core";
import { Accordion, AccordionItem } from "./Accordion";
import { CtaLink } from "./CtaLink";

// Figma PDP (frame "PDP_draft 2", node 759:3281 "Ingredient" / "frequently
// asked questions"), a purple band with white rows. Rows come from
// `listFaqs`, real, CMS-editable answers instead of the literal placeholder
// Q&A in Figma. The first row opens by default, as drawn.
export function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-purple px-3 py-14 desk:px-24 desk:py-24">
      <div className="flex w-full max-w-[90rem] flex-col gap-10 desk:flex-row desk:items-start desk:justify-between">
        <div className="flex flex-col items-start gap-12 desk:flex-1">
          <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-white desk:w-[24.0625rem] desk:text-display-md">
            frequently asked questions
          </p>
          <CtaLink
            href="/#faqs"
            className="bg-onwei-white text-onwei-blue desk:w-[13.9375rem]"
          >
            view all
          </CtaLink>
        </div>

        <div className="w-full desk:w-[41.875rem]">
          <Accordion>
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                id={`faq-${faq.id}`}
                title={faq.question}
                tone="light"
                defaultOpen={index === 0}
              >
                <p className="whitespace-pre-line">{faq.answer}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
