// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const handled = vi.hoisted(() => ({ calls: [] as string[][] }));

vi.mock("@onwei/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@onwei/core")>();
  return {
    ...actual,
    handleIthinkWebhook: vi.fn(async (awbs: string[]) => {
      handled.calls.push(awbs);
      return { ok: true, matched: 0, changed: 0, events: [] };
    }),
  };
});

// Run the background work straight away so the test can see it.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (task: () => unknown) => void task() };
});

const TOKEN = "test-ithink-webhook-token-0123456789";

function push(authorization: string | null, body: unknown): Request {
  return new Request("http://localhost/api/webhooks/ithink", {
    method: "POST",
    headers: authorization ? { authorization } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/webhooks/ithink", () => {
  beforeEach(() => {
    process.env.ITHINK_WEBHOOK_TOKEN = TOKEN;
    handled.calls = [];
  });

  it("refuses a push without the right Bearer token", async () => {
    const { POST } = await import("./route");
    const sample = { awb_number: "AWB001", status: "delivered" };
    for (const auth of [
      null,
      "Bearer wrong-token-wrong-token-wrong-token",
      `Basic ${TOKEN}`,
      TOKEN,
    ]) {
      const response = await POST(push(auth, sample));
      expect(response.status).toBe(401);
    }
    expect(handled.calls).toEqual([]);
  });

  it("refuses everything when no token is set up", async () => {
    delete process.env.ITHINK_WEBHOOK_TOKEN;
    const { POST } = await import("./route");
    const response = await POST(push(`Bearer ${TOKEN}`, { awb_number: "1" }));
    expect(response.status).toBe(401);
  });

  it("takes iThink's sample push and checks that tracking number", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      push(`Bearer ${TOKEN}`, {
        awb_number: "AWB001",
        latest_scan_time: "2022-04-04 15:20:25",
        current_tracking_status: "2",
        status: "picked up",
        remark: "picked",
        location: "mumbai",
        edd_date: "2022-04-10 15:20:25",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    await vi.waitFor(() => expect(handled.calls).toEqual([["AWB001"]]));
  });

  it("answers iThink's empty test request", async () => {
    const { POST } = await import("./route");
    const response = await POST(push(`Bearer ${TOKEN}`, ""));
    expect(response.status).toBe(200);
    expect(handled.calls).toEqual([]);
  });
});
