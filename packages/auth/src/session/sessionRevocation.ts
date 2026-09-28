import { Redis } from "@upstash/redis";

/**
 * Shared by session.ts and staffSession.ts. Neither JWT is otherwise
 * revocable server-side -- a leaked token works until it expires (up to 30
 * days for a customer session) with no kill switch. This gives each a
 * Redis-backed revocation list, keyed by the token's own `jti`, with the
 * same degrade-to-no-op shape as the OTP/waitlist rate limiters: without
 * Upstash configured, revoke() is a no-op and isRevoked() always says no,
 * so verification behavior is unaffected either way -- it just can't
 * actually kill a token until Redis is provisioned.
 */
let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function key(prefix: string, jti: string): string {
  return `${prefix}:revoked:${jti}`;
}

export async function isRevoked(prefix: string, jti: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const value = await redis.get(key(prefix, jti));
  return value != null;
}

/** `ttlSeconds` should match the token's own remaining lifetime. */
export async function revoke(
  prefix: string,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key(prefix, jti), "1", { ex: Math.max(1, ttlSeconds) });
}

// Test-only: resets the module-level singleton so tests can flip env vars
// between cases.
export function _resetSessionRevocationForTests(): void {
  redisClient = undefined;
}
