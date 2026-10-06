import { getSiteSetting } from "@onwei/core";
import { NextResponse, type NextRequest } from "next/server";

// Reachable regardless of site mode, the waitlist page itself, the page it
// links to, the submit endpoint, and static assets.
const ALWAYS_ALLOWED_PREFIXES = [
  "/ontheway",
  "/about",
  "/privacy",
  "/terms",
  "/api/waitlist",
  // Analytics events (rewritten to PostHog in next.config.ts), must never
  // be redirected to the waitlist page.
  "/ingest",
  // Admin's server-to-server ping (triggerCatalogRevalidate), gated by its
  // own REVALIDATE_SECRET bearer-token check inside the route handler
  // itself, so allowing it past this site-mode gate doesn't weaken that.
  // Without this, every admin catalog edit's revalidate call silently 307s
  // instead of running, undetected because that call is fire-and-forget
  // and only checks for network errors, not response status, it was
  // masked by cachedCatalog.ts's 60s fallback window, not actually broken
  // in a user-visible way, but doing nothing.
  "/api/revalidate",
  "/images",
  "/favicon.ico",
  // app/robots.ts and app/sitemap.ts, without these, this same gate
  // 307s a crawler's request for robots.txt itself to /ontheway, which
  // defeats robots.ts's own WAITLIST-mode "disallow everything" response.
  "/robots.txt",
  "/sitemap.xml",
  // app/icon.png and app/apple-icon.png (favicon/apple-touch-icon file
  // conventions), favicon.ico is skipped by this proxy's own matcher
  // below, but these two aren't, so every browser tab/bookmark/home-screen
  // icon request was silently getting the waitlist page's HTML instead of
  // image bytes while gated. Exact matches, not prefixes, these are single
  // files, not directories, so the startsWith(`${prefix}/`) branch below
  // never applies to them.
  "/icon.png",
  "/apple-icon.png",
];

/**
 * Gates the whole storefront behind /ontheway while SiteSetting.siteMode is
 * WAITLIST, see docs/OPEN_DECISIONS.md. Next 16 Proxy runs on the Node.js
 * runtime by default, so a direct @onwei/core call is fine here; no need to
 * self-fetch an API route. getSiteSetting() already caches in-process for
 * ~15s (see packages/core/src/settings/siteSetting.ts), so this isn't a live
 * DB query on every request, though that cache is per server instance, not
 * shared across them, an admin toggling site mode is visible within one
 * cache window, not instantly everywhere.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    ALWAYS_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return NextResponse.next();
  }

  let siteMode: string;
  try {
    siteMode = (await getSiteSetting()).siteMode;
  } catch {
    // Fail closed to the pre-launch gate rather than 500ing or accidentally
    // exposing the unfinished storefront if the settings read fails.
    siteMode = "WAITLIST";
  }

  if (siteMode === "WAITLIST") {
    // Keep the query string so a tagged link (utm_source=...) to any page
    // still lands on the waitlist with its UTM values.
    const target = new URL("/ontheway", request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
