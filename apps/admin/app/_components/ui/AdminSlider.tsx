"use client";

export function AdminSlider({
  min,
  max,
  value,
  onChange,
  disabled = false,
  formatValue,
  className = "",
}: {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Text shown next to the track, e.g. "3 of 4 approved reviews". Defaults to the raw number. */
  formatValue?: (value: number) => string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-onwei-blue/15 accent-onwei-purple disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="w-40 shrink-0 font-cta text-sm text-onwei-blue">
        {formatValue ? formatValue(value) : value}
      </span>
    </div>
  );
}
