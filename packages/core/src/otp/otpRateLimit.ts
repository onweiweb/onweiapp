import { createLazyLimiter } from "../rateLimit/lazyLimiter";

// Separate limits per identifier (email/phone) and per requesting IP.
// Identifier limit is tighter than IP: one phone/email shouldn't need more
// than a handful of OTP requests in 10 minutes even from a shared network.
const identifierLimiter = createLazyLimiter({
  limit: 3,
  window: "10 m",
  prefix: "otp:id",
  failClosedInProduction: true,
});
const ipLimiter = createLazyLimiter({
  limit: 10,
  window: "10 m",
  prefix: "otp:ip",
  failClosedInProduction: true,
});

/**
 * Checks both the per-identifier and (when known) per-IP OTP request limit.
 * Call before requestOtpChallenge() creates a new challenge row.
 */
export async function checkOtpRateLimit(
  identifier: string,
  ip: string | null,
): Promise<{ allowed: boolean }> {
  if (!(await identifierLimiter.check(identifier))) return { allowed: false };
  if (ip && !(await ipLimiter.check(ip))) return { allowed: false };
  return { allowed: true };
}

// Test-only: resets the cached limiters so tests can flip env vars between
// cases.
export function _resetOtpRateLimiterForTests(): void {
  identifierLimiter.reset();
  ipLimiter.reset();
}
