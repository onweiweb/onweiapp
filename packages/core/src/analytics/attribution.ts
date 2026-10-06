// Where a visitor came from. One shared shape so signups today, and orders
// and customers later (Phase 2), carry the same fields.
export interface Attribution {
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

export interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
}

const MAX_LENGTH = 64;

/** Lowercase, trim, collapse anything that isn't a letter, digit, "-" or "_" into "-". */
export function slugifyUtmValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH);
}

function cleanUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = slugifyUtmValue(value);
  return slug || null;
}

function cleanHost(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const host = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(/[/?#]/)[0]
    ?.replace(/^www\./, "")
    .slice(0, 100);
  return host || null;
}

/**
 * Untrusted input from the browser, so every value is shrunk to a short,
 * predictable slug before it is stored or shown in the admin.
 */
export function sanitizeAttribution(raw: unknown): Attribution {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    referrerHost: cleanHost(input.referrerHost),
    utmSource: cleanUtm(input.utmSource),
    utmMedium: cleanUtm(input.utmMedium),
    utmCampaign: cleanUtm(input.utmCampaign),
    utmContent: cleanUtm(input.utmContent),
  };
}

function cleanPlace(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the raw header value if it isn't valid percent-encoding.
  }
  const trimmed = decoded.trim().slice(0, 100);
  return trimmed || null;
}

/** Reads the host's IP-geolocation headers (Vercel). All null when absent. */
export function readGeoHeaders(headers: Headers): GeoLocation {
  return {
    country: cleanPlace(headers.get("x-vercel-ip-country")),
    region: cleanPlace(headers.get("x-vercel-ip-country-region")),
    city: cleanPlace(headers.get("x-vercel-ip-city")),
  };
}
