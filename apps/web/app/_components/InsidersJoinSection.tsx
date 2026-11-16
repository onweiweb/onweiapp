import Image from "@/_components/ScaledImage";
import { ScrollReveal } from "@/_components/ScrollReveal";
import { WaitlistForm } from "@/_components/WaitlistForm";

// Figma node 945:4323 (web) / 945:4451 (mobile), "join onwei insiders": the
// photo plus the signup form. Used on the waitlist page before launch and on
// /insiders after it (owner-approved reuse, 2026-11-16), so both stay one design.
export function InsidersJoinSection({
  instagramUrl,
  place = "waitlist",
}: {
  instagramUrl: string | null;
  place?: "waitlist" | "insiders";
}) {
  return (
    <section
      id="join-onwei-insiders"
      className="flex w-full max-w-[90rem] flex-col gap-8 px-3 py-6 desk:flex-row desk:items-center desk:justify-between desk:px-11 desk:py-14"
    >
      <ScrollReveal
        as="div"
        className="relative order-2 aspect-square w-full overflow-hidden rounded-[1.875rem] desk:order-1 desk:aspect-auto desk:h-[39.6875rem] desk:w-[41.5625rem]"
      >
        <div className="absolute left-[0.01%] top-[-8.37%] h-[150%] w-full desk:left-[-0.13%] desk:top-[-9.76%] desk:h-[157.09%]">
          <Image
            src="/images/waitlist/photo/photo.jpg"
            alt=""
            fill
            sizes="(min-width: 768px) 665px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute right-[6.92%] top-[6.94%] aspect-square w-[11.73%] max-desk:hidden">
          <Image
            src="/images/waitlist/photo/photo-badge.svg"
            alt=""
            fill
            aria-hidden
          />
        </div>
      </ScrollReveal>

      <ScrollReveal
        as="div"
        delay={0.1}
        className="order-1 flex w-full flex-col gap-6 rounded-[1.875rem] px-0 py-6 desk:order-2 desk:w-[41.5625rem] desk:px-14 desk:py-12"
      >
        <div className="flex flex-col gap-3 max-desk:px-2">
          <p className="font-display text-[2.25rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-[3rem]">
            join onwei insiders
          </p>
          <p className="font-grotesk text-[length:max(0.875rem,11px)] leading-[1.3] text-onwei-blue">
            {place === "insiders"
              ? "Takes under a minute. Your personal Insider code comes by email."
              : "Takes under a minute. You'll get your card right after."}
          </p>
        </div>
        <WaitlistForm instagramUrl={instagramUrl} place={place} />
      </ScrollReveal>
    </section>
  );
}
