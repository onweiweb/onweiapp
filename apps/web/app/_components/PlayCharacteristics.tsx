import type { PlayCharacteristics as PlayCharacteristicsDTO } from "@onwei/core";

// Decorative (non-interactive) — Figma's Slider component (node 759:3088 /
// 438:3117) is a flat, uncolored track with just a dot marker positioned at
// the value — no filled/progress segment. Renders real per-product data
// (power/spin/control ratings entered in admin), not a fake/invented
// reading.
function Bar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-display text-[14px] font-medium uppercase text-onwei-blue">
        {label}
      </p>
      <div className="relative h-1 w-full rounded-full bg-onwei-blue/30">
        <div
          className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-onwei-green"
          style={{ left: `calc(${clamped}% - 6px)` }}
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
    <div className="flex w-full flex-col gap-4 py-3">
      <Bar label="Power" value={characteristics.power} />
      <Bar label="Spin" value={characteristics.spin} />
      <Bar label="Control" value={characteristics.control} />
    </div>
  );
}
