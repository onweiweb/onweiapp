import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// The refresh button re-queries PostHog, so a held-down click or a script
// should not be able to hammer it. 6 per minute per staff member is plenty.
const limiter = createLazyLimiter({
  limit: 6,
  window: "1 m",
  prefix: "analytics-refresh",
});

export async function checkAnalyticsRefreshRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}

// Test-only: resets the cached limiter so tests can flip env vars.
export function _resetAnalyticsRefreshRateLimiterForTests(): void {
  limiter.reset();
}
