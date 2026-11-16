import Image from "@/_components/ScaledImage";
import type { InsiderUpdateItem } from "@onwei/core";
import { CtaLink } from "./CtaLink";
import { ScrollReveal } from "./ScrollReveal";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/**
 * "Events and Insider offers" on /insiders (client feedback 2026-11-16),
 * written in admin Insiders > Page updates. No Figma frame: purple cards in
 * the same style as the value-prop cards. Hidden when there are none.
 */
export function InsiderUpdates({ updates }: { updates: InsiderUpdateItem[] }) {
  if (updates.length === 0) return null;
  return (
    <section className="flex w-full max-w-[90rem] flex-col gap-8 px-3 pb-14 pt-6 desk:px-11 desk:pb-20">
      <h2 className="text-center font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-left desk:text-display-md">
        Events and Insider offers
      </h2>
      <div className="grid grid-cols-1 gap-6 desk:grid-cols-3">
        {updates.map((update, index) => (
          <ScrollReveal key={update.id} delay={index * 0.06} className="flex">
            <article className="flex w-full flex-col overflow-hidden rounded-[1.875rem] bg-onwei-purple text-onwei-white">
              {update.imageUrl ? (
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={update.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 30vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col gap-3 p-6">
                {update.eventDate ? (
                  <p className="font-script text-[1.25rem] uppercase leading-none">
                    {DATE.format(new Date(update.eventDate))}
                  </p>
                ) : null}
                <h3 className="font-display text-[1.375rem] font-semibold uppercase leading-[1.1]">
                  {update.title}
                </h3>
                <p className="whitespace-pre-line font-grotesk text-body">
                  {update.body}
                </p>
                {update.linkUrl ? (
                  <CtaLink
                    href={update.linkUrl}
                    className="mt-auto w-fit bg-onwei-beige text-onwei-blue"
                  >
                    {update.linkLabel || "find out more"}
                  </CtaLink>
                ) : null}
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
