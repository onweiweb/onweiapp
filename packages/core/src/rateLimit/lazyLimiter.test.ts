import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLazyLimiter } from "./lazyLimiter";

describe("createLazyLimiter without Upstash configured", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("RATE_LIMIT_ALLOW_UNCONFIGURED", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const options = { limit: 1, window: "1 m" as const, prefix: "test" };

  it("allows the request by default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const limiter = createLazyLimiter(options);
    expect(await limiter.check("x")).toBe(true);
  });

  it("allows the request in development even when fail-closed is set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const limiter = createLazyLimiter({
      ...options,
      failClosedInProduction: true,
    });
    expect(await limiter.check("x")).toBe(true);
  });

  it("denies the request in production when fail-closed is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const limiter = createLazyLimiter({
      ...options,
      failClosedInProduction: true,
    });
    expect(await limiter.check("x")).toBe(false);
  });

  it("allows it in production when explicitly overridden", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_ALLOW_UNCONFIGURED", "true");
    const limiter = createLazyLimiter({
      ...options,
      failClosedInProduction: true,
    });
    expect(await limiter.check("x")).toBe(true);
  });
});
