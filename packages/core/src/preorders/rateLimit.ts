import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// Reserve, pay balance and cancel: generous for a real person, a wall for
// a script hammering payment starts.
const limiter = createLazyLimiter({
  limit: 20,
  window: "10 m",
  prefix: "preorder-action",
});

export async function checkPreorderActionRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}
