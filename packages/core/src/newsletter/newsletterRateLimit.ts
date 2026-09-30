import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// Public footer form with no other gate: 5 per 10 minutes per IP is plenty
// for a person, and blunts scripted list-stuffing.
const limiter = createLazyLimiter({
  limit: 5,
  window: "10 m",
  prefix: "newsletter",
});

export async function checkNewsletterRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}

// Test-only: resets the cached limiter so tests can flip env vars between
// cases.
export function _resetNewsletterRateLimiterForTests(): void {
  limiter.reset();
}
