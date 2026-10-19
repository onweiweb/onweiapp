// Shown instantly while any admin page loads its data, so a click never
// leaves the old screen frozen. The sidebar stays put around it.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading">
      <div className="flex flex-col gap-2 border-b border-onwei-blue/10 pb-4">
        <div className="h-7 w-56 animate-pulse rounded bg-onwei-blue/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-onwei-blue/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[20px] bg-onwei-blue/10"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[20px] bg-onwei-blue/10" />
    </div>
  );
}
