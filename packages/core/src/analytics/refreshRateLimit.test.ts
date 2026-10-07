import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetAnalyticsRefreshRateLimiterForTests,
  checkAnalyticsRefreshRateLimit,
} from "./refreshRateLimit";

beforeEach(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  _resetAnalyticsRefreshRateLimiterForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe("analytics refresh rate limit", () => {
  it("allows the request when Redis is not configured", async () => {
    expect(await checkAnalyticsRefreshRateLimit("staff-1")).toEqual({
      allowed: true,
    });
  });
});
