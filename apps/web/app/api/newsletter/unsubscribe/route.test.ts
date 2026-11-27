// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ tokens: [] as string[] }));

vi.mock("@onwei/core", () => ({
  getClientIp: () => "1.2.3.4",
  checkInsiderLinkRateLimit: async () => ({ allowed: true }),
  unsubscribeNewsletter: async (token: string) => {
    calls.tokens.push(token);
    return token === "good-token" ? "DONE" : "INVALID";
  },
}));

import { POST } from "./route";

const post = (t: string) =>
  POST(
    new Request(`http://localhost/api/newsletter/unsubscribe?t=${t}`, {
      method: "POST",
    }),
  );

describe("POST /api/newsletter/unsubscribe", () => {
  it("unsubscribes with a good link", async () => {
    const response = await post("good-token");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("refuses a bad link", async () => {
    const response = await post("forged");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "LINK_INVALID",
    });
    expect(calls.tokens).toEqual(["good-token", "forged"]);
  });
});
