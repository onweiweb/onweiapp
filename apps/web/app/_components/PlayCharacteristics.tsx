import Image from "@/_components/ScaledImage";
import type { PlayCharacteristics as PlayCharacteristicsDTO } from "@onwei/core";

// Decorative (non-interactive), Figma's Slider component (node 759:3088 /
// 438:3117) is a flat, uncolored track with just a dot marker positioned at
// the value, no filled/progress segment. Renders real per-product data
// (power/spin/control ratings entered in admin), not a fake/invented
// reading.
function Bar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-display text-[length:max(0.875rem,11px)] font-medium uppercase leading-none text-onwei-blue">
        {label}
      </p>
      {/* Figma 438:3094: 4px track at 30% navy, 6px yellow fill up to the
          value, 20px thumb on its end. */}
      <div className="relative h-5 w-full">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-[0.1875rem] bg-onwei-blue/30" />
        <div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-[0.1875rem] bg-onwei-green"
          style={{ width: `${clamped}%` }}
        />
        <Image
          src="/images/pdp/slider-thumb.svg"
          alt=""
          width={20}
          height={20}
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `calc(${clamped}% - 20px)` }}
        />
      </div>
    </div>
  );
}

export function PlayCharacteristics({
  characteristics,
}: {
  characteristics: PlayCharacteristicsDTO;
}) {
  return (
    <div className="flex w-full flex-col gap-3 py-3">
      <Bar label="Power" value={characteristics.power} />
      <Bar label="Spin" value={characteristics.spin} />
      <Bar label="Control" value={characteristics.control} />
    </div>
  );
}
