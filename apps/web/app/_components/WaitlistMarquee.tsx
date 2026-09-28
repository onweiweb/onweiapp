import Image from "next/image";

// Figma node 945:4283 (web) / 945:4434 (mobile) — NOT the shared MarqueeBar:
// this page's marquee runs much larger text (40px web / 28px mobile vs.
// MarqueeBar's 14px label size), a fully-rounded (not 20px) pill, and
// alternates solid-white "We're On our Wei" with hollow/outlined-only "Join
// the fun" — every other repeat of the phrase list is stroke-only, not a
// shared visual across pages. Reusing MarqueeBar here would have been wrong
// for all of the above, not just a copy change.
const ITEMS = ["We're On our Wei", "Join the fun"] as const;

export function WaitlistMarquee() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-onwei-blue px-6 py-3 sm:px-14"
      aria-hidden
    >
      <div className="flex w-max animate-[onwei-marquee_28s_linear_infinite] items-center gap-6">
        {doubled.map((item, index) => {
          const isOutline = index % 2 === 1;
          return (
            <div key={index} className="flex shrink-0 items-center gap-6">
              <p
                className={`whitespace-nowrap font-grotesk text-[28px] font-bold uppercase sm:text-[40px] ${
                  isOutline
                    ? "text-transparent [-webkit-text-stroke:1px_var(--color-onwei-white)]"
                    : "text-onwei-white"
                }`}
              >
                {item}
              </p>
              <Image
                src="/images/hero/marquee-divider.svg"
                alt=""
                width={20}
                height={15}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
