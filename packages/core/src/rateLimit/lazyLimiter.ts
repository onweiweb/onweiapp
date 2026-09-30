import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

/**
 * One Upstash sliding-window limiter, built on first use. Every rate limit in
 * core (OTP, waitlist, staff login) goes through this so the env-var handling
 * and the "no Redis configured" behaviour live in one place.
 *
 * With UPSTASH_REDIS_REST_URL/_TOKEN unset:
 * - default: `check()` allows the request (logged once). Used for low-risk
 *   public forms like the waitlist.
 * - `failClosedInProduction`: in production `check()` denies the request, so
 *   a missing env var shows up immediately instead of silently turning off
 *   protection for credentials or OTP sending. Development stays open.
 *   Set RATE_LIMIT_ALLOW_UNCONFIGURED=true to override (an explicit choice to
 *   run without Redis).
 */
export function createLazyLimiter(options: {
  limit: number;
  window: Window;
  prefix: string;
  failClosedInProduction?: boolean;
}) {
  let limiter: Ratelimit | null | undefined;

  function get(): Ratelimit | null {
    if (limiter !== undefined) return limiter;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      console.warn(
        `[${options.prefix}] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set, rate limiting is not active.`,
      );
      limiter = null;
      return limiter;
    }

    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(options.limit, options.window),
      prefix: options.prefix,
    });
    return limiter;
  }

  return {
    /** Records one hit for `identifier`. True when the request may go ahead. */
    async check(identifier: string): Promise<boolean> {
      const active = get();
      if (active) {
        const { success } = await active.limit(identifier);
        return success;
      }

      const failClosed =
        options.failClosedInProduction === true &&
        process.env.NODE_ENV === "production" &&
        process.env.RATE_LIMIT_ALLOW_UNCONFIGURED !== "true";
      if (failClosed) {
        console.error(
          `[${options.prefix}] Rate limiting is required in production but Upstash is not configured, denying the request.`,
        );
      }
      return !failClosed;
    },
    /** Test-only: forget the cached limiter so a test can flip env vars. */
    reset(): void {
      limiter = undefined;
    },
  };
}
