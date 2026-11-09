import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  RazorpayError,
  RazorpayProvider,
  createRazorpayOrder,
  getRazorpayConfig,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "./razorpay";

const config = { keyId: "rzp_test_abc", keySecret: "secret123" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getRazorpayConfig", () => {
  it("needs both key id and secret", () => {
    expect(getRazorpayConfig({ RAZORPAY_KEY_ID: "a" })).toBeNull();
    expect(
      getRazorpayConfig({ RAZORPAY_KEY_ID: "a", RAZORPAY_KEY_SECRET: "b" }),
    ).toEqual({ keyId: "a", keySecret: "b", webhookSecret: undefined });
  });
});

describe("createRazorpayOrder", () => {
  it("posts paise, INR and receipt with basic auth", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        id: "order_1",
        amount: 129900,
        currency: "INR",
        receipt: "ONW1042",
        status: "created",
      }),
    );
    const order = await createRazorpayOrder(
      config,
      { amountPaise: 129900, receipt: "ONW1042" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(order.id).toBe("order_1");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(JSON.parse(init.body as string)).toMatchObject({
      amount: 129900,
      currency: "INR",
      receipt: "ONW1042",
    });
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("rzp_test_abc:secret123").toString("base64")}`,
    );
  });

  it("refuses amounts under 100 paise or with fractions", async () => {
    const fetchImpl = vi.fn();
    for (const amountPaise of [0, 99, 150.5, -100]) {
      await expect(
        createRazorpayOrder(
          config,
          { amountPaise, receipt: "R1" },
          fetchImpl as unknown as typeof fetch,
        ),
      ).rejects.toBeInstanceOf(RazorpayError);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps 401 to AUTH and 5xx to UNAVAILABLE", async () => {
    const auth = vi.fn(async () =>
      jsonResponse(401, { error: { description: "Authentication failed" } }),
    );
    await expect(
      createRazorpayOrder(
        config,
        { amountPaise: 100, receipt: "R1" },
        auth as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "AUTH", status: 401 });

    const down = vi.fn(async () => jsonResponse(503, {}));
    await expect(
      createRazorpayOrder(
        config,
        { amountPaise: 100, receipt: "R1" },
        down as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "UNAVAILABLE" });
  });
});

describe("signatures", () => {
  it("accepts Razorpay's checkout signature and nothing else", () => {
    const signature = createHmac("sha256", "secret123")
      .update("order_1|pay_1")
      .digest("hex");
    expect(
      verifyRazorpayPaymentSignature(
        { orderId: "order_1", paymentId: "pay_1", signature },
        "secret123",
      ),
    ).toBe(true);
    expect(
      verifyRazorpayPaymentSignature(
        { orderId: "order_1", paymentId: "pay_2", signature },
        "secret123",
      ),
    ).toBe(false);
    expect(
      verifyRazorpayPaymentSignature(
        { orderId: "order_1", paymentId: "pay_1", signature: "" },
        "secret123",
      ),
    ).toBe(false);
    expect(
      verifyRazorpayPaymentSignature(
        { orderId: "order_1", paymentId: "pay_1", signature },
        "other",
      ),
    ).toBe(false);
  });

  it("checks webhooks against the raw body", () => {
    const body = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(body, signature, "whsec")).toBe(true);
    expect(verifyRazorpayWebhookSignature(`${body} `, signature, "whsec")).toBe(
      false,
    );
    expect(verifyRazorpayWebhookSignature(body, null, "whsec")).toBe(false);
  });
});

describe("RazorpayProvider", () => {
  it("maps payment status", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { id: "pay_1", status: "captured" }),
    );
    const provider = new RazorpayProvider(
      config,
      fetchImpl as unknown as typeof fetch,
    );
    await expect(provider.verifyPayment("pay_1")).resolves.toEqual({
      status: "SUCCEEDED",
    });
  });
});
