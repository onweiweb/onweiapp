import Image from "@/_components/ScaledImage";

// Short curated tags split by a small diamond, on one row. Product cards show
// up to three (Figma 380:1672, 761:4906), the PDP panel passes two per row
// (759:3055). Long tags truncate instead of pushing the layout.
export function HighlightTags({
  tags,
  className = "",
}: {
  tags: readonly string[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div
      className={`flex w-full min-w-0 items-center gap-[0.3125rem] overflow-hidden font-display text-[length:max(0.625rem,11px)] text-onwei-blue desk:text-[0.75rem] ${className}`}
    >
      {tags.map((tag, index) => (
        <span key={tag} className="flex min-w-0 items-center gap-[0.3125rem]">
          {index > 0 ? (
            <Image
              src="/images/shared/chip-divider.svg"
              alt=""
              width={10}
              height={8}
              aria-hidden
            />
          ) : null}
          <span className="truncate">{tag}</span>
        </span>
      ))}
    </div>
  );
}
