import { describe, expect, it } from "vitest";
import {
  createStaffSessionToken,
  verifyStaffSessionToken,
} from "./staffSession";

describe("staff session token", () => {
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
});
