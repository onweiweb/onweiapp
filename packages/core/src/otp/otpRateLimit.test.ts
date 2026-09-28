import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetOtpRateLimiterForTests,
  checkOtpRateLimit,
} from "./otpRateLimit";

describe("checkOtpRateLimit", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    _resetOtpRateLimiterForTests();
  });

  afterEach(() => {
    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    _resetOtpRateLimiterForTests();
  });

  it("allows the request when Upstash env vars are not configured", async () => {
    const result = await checkOtpRateLimit("+919999999999", "1.2.3.4");
    expect(result.allowed).toBe(true);
  });

  it("allows the request when no IP is known and Upstash isn't configured", async () => {
    const result = await checkOtpRateLimit("someone@example.com", null);
    expect(result.allowed).toBe(true);
  });
});
