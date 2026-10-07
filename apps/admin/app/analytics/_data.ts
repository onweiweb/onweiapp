import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  getDeviceSplit,
  getEngagement,
  getFormFunnels,
  getLocations,
  getSourceBreakdown,
  getTopPages,
  getTrafficSummary,
  type AnalyticsQueryOptions,
  type AnalyticsRangeDays,
  type PageFilter,
} from "@onwei/core";

// PostHog answers each report in 1 to 3 seconds, so in production every
// report is cached for a minute in Next's shared cache. It survives across
// requests and across serverless instances, so only the first person to open
// the page in a window waits. Local development skips caching so numbers are
// always current.
const CACHE_SECONDS = 60;
const USE_CACHE = process.env.NODE_ENV !== "development";

export interface ReportScope {
  days: AnalyticsRangeDays;
  page: PageFilter;
  ownHost: string | null;
}

/** A report plus the moment PostHog was actually asked (not when it was shown). */
export interface Timed<T> {
  data: T;
  fetchedAt: number;
}

function cachedReport<T>(
  name: string,
  load: (opts: AnalyticsQueryOptions) => Promise<T>,
  // Only the sources report cares which host is our own. Leaving it out of
  // the other keys lets the dashboard card and this page share one entry.
  usesOwnHost = false,
) {
  const run = async (
    days: number,
    pageJson: string,
    ownHost: string | null,
  ): Promise<Timed<T>> => {
    const started = Date.now();
    const data = await load({
      days: days as AnalyticsRangeDays,
      page: JSON.parse(pageJson) as PageFilter,
      ownHost,
    });
    if (!USE_CACHE) {
      console.log(
        `[analytics] ${name} days=${days} page=${pageJson} ${Date.now() - started}ms`,
      );
    }
    return { data, fetchedAt: Date.now() };
  };
  const loadScope = USE_CACHE
    ? unstable_cache(
        // Arguments must be plain values to form the cache key.
        run,
        ["analytics-report", name],
        { revalidate: CACHE_SECONDS, tags: ["analytics"] },
      )
    : run;
  const forScope = (scope: ReportScope) =>
    loadScope(
      scope.days,
      JSON.stringify(scope.page),
      usesOwnHost ? scope.ownHost : null,
    );
  // React's per-request cache, so two sections asking for the same report
  // (Visitors and Engagement both need engagement) share one query even on a
  // cold cache. Relies on every section receiving the same scope object.
  return cache(forScope);
}

export const traffic = cachedReport("traffic", getTrafficSummary);
export const sources = cachedReport("sources", getSourceBreakdown, true);
export const devices = cachedReport("devices", getDeviceSplit);
export const engagement = cachedReport("engagement", getEngagement);
export const topPages = cachedReport("top-pages", getTopPages);
export const forms = cachedReport("forms", getFormFunnels);
export const locations = cachedReport("locations", getLocations);
