// Dates that pass through `unstable_cache` (lib/cachedCatalog.ts) come back as
// ISO strings, not Date objects, so anything formatting them has to accept
// both. Fixed to UTC and en-US so the server and browser print the same
// text, e.g. "Feb 25, 2026" (the Figma format).
export function formatArticleDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
