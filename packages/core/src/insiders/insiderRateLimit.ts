import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// The "Share your address" and unsubscribe links. A member saves their
// address once or twice; 10 tries per 10 minutes per IP is plenty and blunts
// anyone hammering tokens.
const limiter = createLazyLimiter({
  limit: 10,
  window: "10 m",
  prefix: "insider-link",
});

export async function checkInsiderLinkRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}
