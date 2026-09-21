import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

describe("session token", () => {
  it("round-trips a payload through sign and verify", async () => {
    const token = await createSessionToken(
      { customerId: "cust_123" },
      "secret-a",
    );

    const payload = await verifySessionToken(token, "secret-a");

    expect(payload).toEqual({ customerId: "cust_123" });
  });

  it("returns null when verified with the wrong secret", async () => {
    const token = await createSessionToken(
      { customerId: "cust_123" },
      "secret-a",
    );

    expect(await verifySessionToken(token, "secret-b")).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(await verifySessionToken("not-a-real-token", "secret-a")).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await createSessionToken(
      { customerId: "cust_123" },
      "secret-a",
      "1s",
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(await verifySessionToken(token, "secret-a")).toBeNull();
  });
});
