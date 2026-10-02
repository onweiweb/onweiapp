// Single source of truth for this app's own public origin, used by
// app/sitemap.ts, app/robots.ts, and app/layout.tsx's metadataBase, all
// three need an absolute URL and none of them should hardcode it
// separately. Falls back to the real production domain (onwei.in, not the
// onweiapp.vercel.app default Vercel gives the project) so a missing env
// var in a preview deploy doesn't silently point crawlers at the wrong
// origin.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.onwei.in"
).replace(/\/$/, "");
