import Image from "@/_components/ScaledImage";

// Extracted from the Homepage (was page-local), the PDP has its own
// marquee bar too (Figma node 759:3115), same component, different copy.
//
// Seamless loop: the track is two identical groups and animates by exactly
// -50%, so the second group lands where the first started. For that to be
// pixel-exact, each group carries its own trailing gap (pr-6) instead of
// relying on the track's gap, which would leave the halves half a gap
// apart and visibly jump on restart. Each group also repeats the items so
// it's always wider than the bar, even with only a couple of items.
const REPEATS = 4;

function MarqueeGroup({ items }: { items: readonly string[] }) {
  const repeated = Array.from({ length: REPEATS }, () => items).flat();
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6">
      {repeated.map((item, index) => (
        <div key={index} className="flex shrink-0 items-center gap-6">
          <p className="whitespace-nowrap font-grotesk text-label uppercase text-onwei-white">
            {item}
          </p>
          <Image
            src="/images/hero/marquee-divider.svg"
            alt=""
            width={20}
            height={15}
          />
        </div>
      ))}
    </div>
  );
}

export function MarqueeBar({ items }: { items: readonly string[] }) {
  return (
    <div
      className="w-full overflow-hidden rounded-[1.25rem] bg-onwei-blue py-3"
      aria-hidden
    >
      <div className="flex w-max animate-[onwei-marquee_60s_linear_infinite]">
        <MarqueeGroup items={items} />
        <MarqueeGroup items={items} />
      </div>
    </div>
  );
}
