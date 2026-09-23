import Image from "next/image";

export interface ValueProp {
  illustration: string;
  width: number;
  height: number;
  title: string;
  body: string;
}

// Extracted from the Homepage's ShowcaseSection (was page-local) — the PDP
// uses the same cards (Figma node 759:3117, same illustration assets,
// different copy) in a full-width row instead of stacked beside a video, so
// the wrapping flex direction is the caller's call, not baked in here.
export function ValueProps({ items }: { items: readonly ValueProp[] }) {
  return (
    <>
      {items.map((prop) => (
        <div
          key={prop.title}
          className="flex flex-1 flex-col items-center justify-center gap-8 rounded-[30px] bg-onwei-purple px-6 py-8 text-center"
        >
          <Image
            src={prop.illustration}
            alt=""
            width={prop.width}
            height={prop.height}
            aria-hidden
          />
          <div className="flex flex-col items-start gap-3 text-left text-onwei-white">
            <p className="font-display text-[18px] font-medium uppercase tracking-[0.216px]">
              {prop.title}
            </p>
            <p className="font-grotesk text-[14px]">{prop.body}</p>
          </div>
        </div>
      ))}
    </>
  );
}
