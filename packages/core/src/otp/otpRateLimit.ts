import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Separate limits per identifier (email/phone) and per requesting IP, same
// degrade-to-disabled shape as packages/core/src/waitlist/waitlistRateLimit.ts.
// Identifier limit is tighter than IP: one phone/email shouldn't need more
// than a handful of OTP requests in 10 minutes even from a shared network.
const IDENTIFIER_LIMIT = 3;
const IDENTIFIER_WINDOW = "10 m";
const IP_LIMIT = 10;
const IP_WINDOW = "10 m";

let identifierLimiter: Ratelimit | null | undefined;
let ipLimiter: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getIdentifierLimiter(): Ratelimit | null {
  if (identifierLimiter !== undefined) return identifierLimiter;

  const redis = getRedis();
  if (!redis) {
    // Degrades to "no rate limiting" rather than blocking OTP requests —
    // same tradeoff as waitlist. Set UPSTASH_REDIS_REST_URL/_TOKEN before
    // real traffic hits /login.
    console.warn(
      "[otp] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — OTP rate limiting is disabled.",
    );
    identifierLimiter = null;
    return identifierLimiter;
  }

  identifierLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(IDENTIFIER_LIMIT, IDENTIFIER_WINDOW),
    prefix: "otp:id",
  });
  return identifierLimiter;
}

function getIpLimiter(): Ratelimit | null {
  if (ipLimiter !== undefined) return ipLimiter;

  const redis = getRedis();
  if (!redis) {
    ipLimiter = null;
    return ipLimiter;
  }

  ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(IP_LIMIT, IP_WINDOW),
    prefix: "otp:ip",
  });
  return ipLimiter;
}

/**
 * Checks both the per-identifier and (when known) per-IP OTP request limit.
 * Call before requestOtpChallenge() creates a new challenge row.
 */
export async function checkOtpRateLimit(
  identifier: string,
  ip: string | null,
): Promise<{ allowed: boolean }> {
  const idLimiter = getIdentifierLimiter();
  if (idLimiter) {
    const { success } = await idLimiter.limit(identifier);
    if (!success) return { allowed: false };
  }

  if (ip) {
    const limiter = getIpLimiter();
    if (limiter) {
      const { success } = await limiter.limit(ip);
      if (!success) return { allowed: false };
    }
  }

  return { allowed: true };
}

// Test-only: resets the module-level singletons so tests can flip env vars
// between cases.
export function _resetOtpRateLimiterForTests(): void {
  identifierLimiter = undefined;
  ipLimiter = undefined;
}
