import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 5 submissions per 10 minutes per identifier (IP) — nobody legitimately
// submits this form repeatedly; this only exists to blunt scripted spam
// once /waitlist is publicly linked.
const LIMIT = 5;
const WINDOW = "10 m";

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Degrades to "no rate limiting" rather than blocking signups — see
    // docs/OPEN_DECISIONS.md. Set these env vars before /waitlist is
    // actually linked publicly.
    console.warn(
      "[waitlist] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — waitlist rate limiting is disabled.",
    );
    limiter = null;
    return limiter;
  }

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    prefix: "waitlist",
  });
  return limiter;
}

export async function checkWaitlistRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  const rl = getLimiter();
  if (!rl) return { allowed: true };

  const { success } = await rl.limit(identifier);
  return { allowed: success };
}

// Test-only: resets the module-level singleton so tests can flip env vars
// between cases.
export function _resetWaitlistRateLimiterForTests(): void {
  limiter = undefined;
}
