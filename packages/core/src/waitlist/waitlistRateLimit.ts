import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// 5 submissions per 10 minutes per identifier (IP). Nobody legitimately
// submits this form repeatedly; this only exists to blunt scripted spam
// once /waitlist is publicly linked.
const limiter = createLazyLimiter({
  limit: 5,
  window: "10 m",
  prefix: "waitlist",
});

export async function checkWaitlistRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}

// Test-only: resets the cached limiter so tests can flip env vars between
// cases.
export function _resetWaitlistRateLimiterForTests(): void {
  limiter.reset();
}
