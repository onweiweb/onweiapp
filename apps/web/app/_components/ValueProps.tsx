import Image from "@/_components/ScaledImage";

export interface ValueProp {
  illustration: string;
  width: number;
  height: number;
  title: string;
  body: string;
}

// Extracted from the Homepage's ShowcaseSection (was page-local), the PDP
// uses the same cards (Figma node 759:3117, same illustration assets,
// different copy) in a full-width row instead of stacked beside a video, so
// the wrapping flex direction is the caller's call, not baked in here.
// Mobile Homepage frame (761:4980) draws the three illustrations a little
// smaller than desktop (139, 154 and 140px wide instead of 151, 168, 170).
const STACKED_MOBILE_WIDTH_CLASSES = [
  "max-desk:!w-[8.6875rem]",
  "max-desk:!w-[9.625rem]",
  "max-desk:!w-[8.75rem]",
] as const;

export function ValueProps({
  items,
  stacked = false,
  row = false,
}: {
  items: readonly ValueProp[];
  // Homepage column (Figma 758:2317): fixed 287px cards with a 109px text
  // block, unlike the PDP row where the cards share the row height.
  stacked?: boolean;
  // PDP strip (Figma 759:3117): three equal 287px cards side by side.
  row?: boolean;
}) {
  return (
    <>
      {items.map((prop, index) => (
        <div
          key={prop.title}
          className={`flex flex-col items-center justify-center gap-8 rounded-[1.875rem] bg-onwei-purple px-6 py-8 text-center ${stacked ? "desk:h-[17.9375rem] desk:flex-none" : row ? "desk:h-[17.9375rem] flex-1" : "flex-1"}`}
        >
          <Image
            src={prop.illustration}
            alt=""
            width={prop.width}
            height={prop.height}
            aria-hidden
            className={
              stacked ? STACKED_MOBILE_WIDTH_CLASSES[index] : undefined
            }
          />
          <div
            className={`flex flex-col items-start gap-3 text-left text-onwei-white ${stacked || row ? "h-[6.8125rem] w-full" : ""}`}
          >
            <p className="font-display text-[length:max(1rem,11px)] font-medium uppercase leading-[1.3] tracking-[0.012rem] desk:text-[length:max(1.125rem,11px)] desk:tracking-[0.0135rem]">
              {prop.title}
            </p>
            <p className="font-grotesk text-body">{prop.body}</p>
          </div>
        </div>
      ))}
    </>
  );
}
