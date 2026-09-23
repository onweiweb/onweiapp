import Image from "next/image";

// Extracted from the Homepage (was page-local) — the PDP has its own
// marquee bar too (Figma node 759:3115), same component, different copy.
export function MarqueeBar({ items }: { items: readonly string[] }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="w-full overflow-hidden rounded-[20px] bg-onwei-blue px-14 py-3"
      aria-hidden
    >
      <div className="flex w-max animate-[onwei-marquee_28s_linear_infinite] gap-6">
        {doubled.map((item, index) => (
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
    </div>
  );
}
