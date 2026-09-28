import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetWaitlistRateLimiterForTests,
  checkWaitlistRateLimit,
} from "./waitlistRateLimit";

describe("checkWaitlistRateLimit", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    _resetWaitlistRateLimiterForTests();
  });

  afterEach(() => {
    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    _resetWaitlistRateLimiterForTests();
  });

  it("allows the request when Upstash env vars are not configured", async () => {
    const result = await checkWaitlistRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
  });
});
