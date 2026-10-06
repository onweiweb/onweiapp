import { SECTION_TITLES, SectionSkeleton } from "./_skeleton";

// Shown the moment someone clicks through to this page, while the server
// checks their sign-in, so the click is acknowledged straight away.
export default function AnalyticsLoading() {
  return (
    <main className="flex flex-col gap-8" aria-busy="true">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Visitors and engagement
      </h1>
      <div className="flex flex-col gap-3">
        <div className="h-8 w-80 animate-pulse rounded-[30px] bg-onwei-blue/10" />
        <div className="h-8 w-[28rem] max-w-full animate-pulse rounded-[30px] bg-onwei-blue/10" />
      </div>
      {SECTION_TITLES.map((title) => (
        <SectionSkeleton key={title} title={title} />
      ))}
    </main>
  );
}
