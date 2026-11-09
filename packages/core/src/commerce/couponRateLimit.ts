import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// Coupon safety rule 9: wrong-code attempts are limited per person and per
// IP, so nobody can guess codes by trying thousands.
const limiter = createLazyLimiter({
  limit: 15,
  window: "10 m",
  prefix: "coupon-attempt",
});

export async function checkCouponAttemptRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}
