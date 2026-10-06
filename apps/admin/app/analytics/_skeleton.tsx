// Plain markup (no hooks), so both server and client components can use it.
export function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold uppercase">{title}</h2>
      <div
        aria-busy="true"
        aria-label={`Loading ${title}`}
        className="h-28 animate-pulse rounded-[30px] bg-onwei-blue/10"
      />
    </section>
  );
}

/** The sections in page order, used for both the loading screen and the filter-change placeholders. */
export const SECTION_TITLES = [
  "Visitors",
  "Where visitors came from",
  "Phone or computer",
  "How people use the site",
  "Most visited pages",
  "Forms",
  "Where people are",
] as const;
