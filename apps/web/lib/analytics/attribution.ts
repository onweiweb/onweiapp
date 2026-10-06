// First-touch attribution for a visit: the UTM values and referrer from the
// page the visitor landed on. Kept in sessionStorage (not a cookie) so it
// survives page changes within the visit but is gone when the tab closes.

export interface FirstTouch {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrerHost: string | null;
}

const KEY = "onwei-first-touch";
const VISIT_KEY = "onwei-visit-id";

function safeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function referrerHostOf(
  referrer: string,
  ownHost: string,
): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host === ownHost.replace(/^www\./, "") ? null : host;
  } catch {
    return null;
  }
}

export function readFirstTouchFromUrl(
  search: string,
  referrer: string,
  ownHost: string,
): FirstTouch {
  const params = new URLSearchParams(search);
  const get = (name: string) => params.get(name)?.trim() || null;
  return {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    utmContent: get("utm_content"),
    referrerHost: referrerHostOf(referrer, ownHost),
  };
}

function hasAnything(t: FirstTouch): boolean {
  return Boolean(
    t.utmSource ||
    t.utmMedium ||
    t.utmCampaign ||
    t.utmContent ||
    t.referrerHost,
  );
}

/** Returns this visit's first touch, saving it on the first call that has data. */
export function getFirstTouch(): FirstTouch {
  const empty: FirstTouch = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    referrerHost: null,
  };
  if (typeof window === "undefined") return empty;
  const storage = safeStorage();
  try {
    const saved = storage?.getItem(KEY);
    if (saved) return JSON.parse(saved) as FirstTouch;
  } catch {
    // Fall through and read it fresh.
  }
  const fresh = readFirstTouchFromUrl(
    window.location.search,
    document.referrer,
    window.location.hostname,
  );
  if (hasAnything(fresh)) {
    try {
      storage?.setItem(KEY, JSON.stringify(fresh));
    } catch {
      // Storage blocked, the value just won't survive page changes.
    }
  }
  return fresh;
}

/** A random id for this tab's visit. Never leaves sessionStorage except as an event property. */
export function getVisitId(): string {
  const storage = safeStorage();
  try {
    const saved = storage?.getItem(VISIT_KEY);
    if (saved) return saved;
  } catch {
    // Use a fresh id below.
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    storage?.setItem(VISIT_KEY, id);
  } catch {
    // Storage blocked, this id lasts for the current page only.
  }
  return id;
}
