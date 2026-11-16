// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyGupshupStatus = vi.fn(async () => true);
const recordWhatsAppOptOut = vi.fn(async () => undefined);

vi.mock("@onwei/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onwei/core")>()),
  applyGupshupStatus,
  recordWhatsAppOptOut,
}));

const TOKEN = "t".repeat(48);
process.env.GUPSHUP_WEBHOOK_TOKEN = TOKEN;

async function post(token: string, body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request(`http://localhost/api/webhooks/gupshup/${token}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ token }) },
  );
}

describe("POST /api/webhooks/gupshup/[token]", () => {
  beforeEach(() => {
    applyGupshupStatus.mockClear();
    recordWhatsAppOptOut.mockClear();
  });

  it("applies a delivery update", async () => {
    const response = await post(TOKEN, {
      type: "message-event",
      timestamp: 1,
      payload: { id: "m-1", type: "delivered", payload: {} },
    });
    expect(response.status).toBe(200);
    expect(applyGupshupStatus).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["m-1"], status: "DELIVERED" }),
    );
  });

  it("opts a number out when they reply STOP", async () => {
    await post(TOKEN, {
      type: "message",
      payload: { source: "919876543210", payload: { text: "stop" } },
    });
    expect(recordWhatsAppOptOut).toHaveBeenCalledWith("+919876543210");
  });

  it("refuses a wrong token without touching anything", async () => {
    const response = await post("x".repeat(48), {
      type: "message",
      payload: { source: "919876543210", payload: { text: "STOP" } },
    });
    expect(response.status).toBe(404);
    expect(recordWhatsAppOptOut).not.toHaveBeenCalled();
  });
});
