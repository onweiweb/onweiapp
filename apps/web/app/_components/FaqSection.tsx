import type { FaqItem } from "@onwei/core";
import { Accordion, AccordionItem } from "./Accordion";
import { CtaLink } from "./CtaLink";

// Figma PDP (frame "PDP_draft 2", node 759:3281 "Ingredient" / "frequently
// asked questions") — accordion rows backed by `listFaqs`, real,
// CMS-editable answers instead of the literal placeholder Q&A in Figma.
export function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-14 sm:px-6 lg:px-14">
      <div className="flex w-full max-w-[1440px] flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col items-start gap-8 lg:max-w-[386px]">
          <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue">
            frequently asked questions
          </p>
          <CtaLink href="/#faqs" className="bg-onwei-blue text-onwei-beige">
            ask a question
          </CtaLink>
        </div>

        <div className="w-full lg:max-w-[670px]">
          <Accordion>
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                id={`faq-${faq.id}`}
                title={faq.question}
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
