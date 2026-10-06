import { unstable_cache } from "next/cache";
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
// report is cached for a minute in Next's shared cache. Unlike core's
// in-memory cache, this one survives across requests and across serverless
// instances, so only the first person to open the page in a window waits.
// Local development skips caching so numbers are always current.
const CACHE_SECONDS = 60;
const USE_CACHE = process.env.NODE_ENV !== "development";

export interface ReportScope {
  days: AnalyticsRangeDays;
  page: PageFilter;
  ownHost: string | null;
}

function cachedReport<T>(
  name: string,
  load: (opts: AnalyticsQueryOptions) => Promise<T>,
) {
  const run = (days: number, pageJson: string, ownHost: string | null) =>
    load({
      days: days as AnalyticsRangeDays,
      page: JSON.parse(pageJson) as PageFilter,
      ownHost,
    });
  if (!USE_CACHE) {
    return async (scope: ReportScope) => {
      const started = Date.now();
      const result = await run(
        scope.days,
        JSON.stringify(scope.page),
        scope.ownHost,
      );
      console.log(
        `[analytics] ${name} days=${scope.days} page=${JSON.stringify(scope.page)} ${Date.now() - started}ms`,
      );
      return result;
    };
  }
  const cached = unstable_cache(
    // Arguments must be plain values to form the cache key.
    run,
    ["analytics-report", name],
    { revalidate: CACHE_SECONDS, tags: ["analytics"] },
  );
  return (scope: ReportScope) =>
    cached(scope.days, JSON.stringify(scope.page), scope.ownHost);
}

export const traffic = cachedReport("traffic", getTrafficSummary);
export const sources = cachedReport("sources", getSourceBreakdown);
export const devices = cachedReport("devices", getDeviceSplit);
export const engagement = cachedReport("engagement", getEngagement);
export const topPages = cachedReport("top-pages", getTopPages);
export const forms = cachedReport("forms", getFormFunnels);
export const locations = cachedReport("locations", getLocations);
