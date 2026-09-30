import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createStaffSessionToken,
  revokeStaffSessionToken,
  verifyStaffSessionToken,
} from "./staffSession";

describe("staff session token", () => {
  // These cases assume no Redis. A build environment (for example Vercel) may
  // have the Upstash variables set, and the revocation client caches on first
  // use, so blank them before any call.
  beforeAll(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  it("round-trips a payload through sign and verify", async () => {
    const token = await createStaffSessionToken(
      { staffUserId: "staff_123" },
      "secret-a",
    );

    const payload = await verifyStaffSessionToken(token, "secret-a");

    expect(payload).toEqual({ staffUserId: "staff_123" });
  });

  it("returns null when verified with the wrong secret", async () => {
    const token = await createStaffSessionToken(
      { staffUserId: "staff_123" },
      "secret-a",
    );

    expect(await verifyStaffSessionToken(token, "secret-b")).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(
      await verifyStaffSessionToken("not-a-real-token", "secret-a"),
    ).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await createStaffSessionToken(
      { staffUserId: "staff_123" },
      "secret-a",
      "1s",
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(await verifyStaffSessionToken(token, "secret-a")).toBeNull();
  });

  it("is not interchangeable with a customer session token from the same secret", async () => {
    const { createSessionToken } = await import("./session");
    const customerToken = await createSessionToken(
      { customerId: "cust_123" },
      "shared-secret",
    );

    // A customer token has no staffUserId claim, so it must not verify as a
    // staff session even if the secrets happened to match.
    expect(
      await verifyStaffSessionToken(customerToken, "shared-secret"),
    ).toBeNull();
  });

  it("revoke() degrades to a no-op without Upstash configured, so the token still verifies", async () => {
    const token = await createStaffSessionToken(
      { staffUserId: "staff_123" },
      "secret-a",
    );

    await expect(
      revokeStaffSessionToken(token, "secret-a"),
    ).resolves.toBeUndefined();
    expect(await verifyStaffSessionToken(token, "secret-a")).toEqual({
      staffUserId: "staff_123",
    });
  });
});
