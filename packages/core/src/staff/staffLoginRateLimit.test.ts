import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetStaffLoginRateLimiterForTests,
  checkStaffLoginRateLimit,
} from "./staffLoginRateLimit";

describe("checkStaffLoginRateLimit", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    _resetStaffLoginRateLimiterForTests();
  });

  afterEach(() => {
    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    _resetStaffLoginRateLimiterForTests();
  });

  it("allows the attempt when Upstash env vars are not configured", async () => {
    const result = await checkStaffLoginRateLimit("a@example.com", "1.2.3.4");
    expect(result.allowed).toBe(true);
  });

  it("allows the attempt when no IP is known", async () => {
    const result = await checkStaffLoginRateLimit("a@example.com", null);
    expect(result.allowed).toBe(true);
  });
});
