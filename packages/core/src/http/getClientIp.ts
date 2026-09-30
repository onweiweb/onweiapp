/**
 * The caller's IP as reported by the platform proxy (first entry of
 * x-forwarded-for), or null when there is none (local dev, tests). Only use
 * it for rate limiting and audit hints, never for access decisions: the
 * header is client-settable anywhere outside Vercel's edge.
 */
export function getClientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
