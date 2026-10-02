import Image from "@/_components/ScaledImage";

// Figma node 945:4283 (web) / 945:4434 (mobile), NOT the shared MarqueeBar:
// this page's marquee runs much larger text on web (40px) than
// MarqueeBar's 14px label size, a fully-rounded (not 20px) pill, and
// alternates solid-white "We're On our Wei" with hollow/outlined-only "Join
// the fun", every other repeat of the phrase list is stroke-only, not a
// shared visual across pages. Reusing MarqueeBar here would have been wrong
// for all of the above, not just a copy change.
//
// Mobile text is 18px, not Figma's spec'd 28px, per feedback, 28px left
// well under one full phrase visible in the pill's width on a real phone
// screen (the mock's own frame is wider than that). 18px is a deliberate
// deviation from Figma for this reason, not a mistake.
const ITEMS = ["We're On our Wei", "Join the fun"] as const;

// Seamless loop (same approach as MarqueeBar): two identical groups, the
// track slides exactly -50%. Each group repeats the phrases so it is always
// wider than the pill, otherwise wide desktop screens show an empty tail.
// REPEATS is even so the solid/outline alternation matches across groups.
const REPEATS = 4;

function MarqueeGroup() {
  const items = Array.from({ length: REPEATS }, () => ITEMS).flat();
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6">
      {items.map((item, index) => {
        const isOutline = index % 2 === 1;
        return (
          <div key={index} className="flex shrink-0 items-center gap-6">
            <p
              className={`whitespace-nowrap font-grotesk text-[length:max(1.125rem,11px)] font-bold uppercase desk:text-[2.5rem] ${
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
  );
}

export function WaitlistMarquee() {
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-onwei-blue px-6 py-3 desk:px-14"
      aria-hidden
    >
      {/* Duration scales with the doubled content so the speed stays the
          same as the original 18.7s (1.5x the first version, per feedback). */}
      <div className="flex w-max animate-[onwei-marquee_75s_linear_infinite] items-center">
        <MarqueeGroup />
        <MarqueeGroup />
      </div>
    </div>
  );
}
