import { getSiteSetting } from "@onwei/core";
import { NextResponse, type NextRequest } from "next/server";

// Reachable regardless of site mode — the waitlist page itself, the page it
// links to, the submit endpoint, and static assets.
const ALWAYS_ALLOWED_PREFIXES = [
  "/waitlist",
  "/about",
  "/api/waitlist",
  "/images",
  "/favicon.ico",
];

/**
 * Gates the whole storefront behind /waitlist while SiteSetting.siteMode is
 * WAITLIST — see docs/OPEN_DECISIONS.md. Next 16 Proxy runs on the Node.js
 * runtime by default, so a direct @onwei/core call is fine here; no need to
 * self-fetch an API route. getSiteSetting() already caches in-process for
 * ~15s (see packages/core/src/settings/siteSetting.ts), so this isn't a live
 * DB query on every request, though that cache is per server instance, not
 * shared across them — an admin toggling site mode is visible within one
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
    return NextResponse.redirect(new URL("/waitlist", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
