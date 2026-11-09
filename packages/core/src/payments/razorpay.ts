import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./PaymentProvider";

/**
 * Razorpay Standard Checkout, server side. Plain fetch against the REST API
 * (same approach as the Resend sender), no SDK dependency.
 *
 * Money rule (docs/COMMERCE_BUILD_PLAN.md, section 5): the amount always
 * comes from an order the server priced itself. Nothing here accepts an
 * amount from the browser; callers pass the stored order total in paise.
 *
 * Secrets: RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET never leave the
 * server. RAZORPAY_KEY_ID is public and is handed to the browser alongside
 * each Razorpay order, so no NEXT_PUBLIC_ copy is needed.
 */

const API_BASE = "https://api.razorpay.com/v1";
export const RAZORPAY_MIN_AMOUNT_PAISE = 100;

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export function getRazorpayConfig(
  env: Record<string, string | undefined> = process.env,
): RazorpayConfig | null {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET };
}

export type RazorpayErrorKind = "AUTH" | "INVALID_REQUEST" | "UNAVAILABLE";

export class RazorpayError extends Error {
  constructor(
    readonly kind: RazorpayErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

type Fetch = typeof fetch;

async function call<T>(
  config: RazorpayConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  fetchImpl: Fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(`${API_BASE}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new RazorpayError("UNAVAILABLE", 0, "Could not reach Razorpay");
  }
  if (response.ok) return (await response.json()) as T;

  let description = `Razorpay responded ${response.status}`;
  try {
    const body = (await response.json()) as {
      error?: { description?: string };
    };
    if (body.error?.description) description = body.error.description;
  } catch {
    // keep the status-only message
  }
  const kind: RazorpayErrorKind =
    response.status === 401
      ? "AUTH"
      : response.status >= 500
        ? "UNAVAILABLE"
        : "INVALID_REQUEST";
  throw new RazorpayError(kind, response.status, description);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: "INR";
  receipt: string;
  status: string;
}

export async function createRazorpayOrder(
  config: RazorpayConfig,
  input: {
    amountPaise: number;
    /** Our order number, at most 40 characters (Razorpay limit). */
    receipt: string;
    notes?: Record<string, string>;
  },
  fetchImpl: Fetch = fetch,
): Promise<RazorpayOrder> {
  if (
    !Number.isInteger(input.amountPaise) ||
    input.amountPaise < RAZORPAY_MIN_AMOUNT_PAISE
  ) {
    throw new RazorpayError(
      "INVALID_REQUEST",
      400,
      `Amount must be a whole number of paise, at least ${RAZORPAY_MIN_AMOUNT_PAISE}`,
    );
  }
  if (input.receipt.length < 1 || input.receipt.length > 40) {
    throw new RazorpayError(
      "INVALID_REQUEST",
      400,
      "Receipt must be 1 to 40 characters",
    );
  }
  return call<RazorpayOrder>(
    config,
    "/orders",
    {
      method: "POST",
      body: {
        amount: input.amountPaise,
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes,
      },
    },
    fetchImpl,
  );
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string;
}

export async function fetchRazorpayPayment(
  config: RazorpayConfig,
  paymentId: string,
  fetchImpl: Fetch = fetch,
): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(
    config,
    `/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
    fetchImpl,
  );
}

/**
 * Captures an authorized payment (needed when the Razorpay account doesn't
 * capture automatically). Amount must equal what was authorized.
 */
export async function captureRazorpayPayment(
  config: RazorpayConfig,
  paymentId: string,
  amountPaise: number,
  fetchImpl: Fetch = fetch,
): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(
    config,
    `/payments/${encodeURIComponent(paymentId)}/capture`,
    { method: "POST", body: { amount: amountPaise, currency: "INR" } },
    fetchImpl,
  );
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: "pending" | "processed" | "failed";
}

/** Refunds part or all of a captured payment, amount in paise. */
export async function createRazorpayRefund(
  config: RazorpayConfig,
  input: {
    paymentId: string;
    amountPaise: number;
    notes?: Record<string, string>;
  },
  fetchImpl: Fetch = fetch,
): Promise<RazorpayRefund> {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    throw new RazorpayError(
      "INVALID_REQUEST",
      400,
      "Refund must be at least 100 paise",
    );
  }
  return call<RazorpayRefund>(
    config,
    `/payments/${encodeURIComponent(input.paymentId)}/refund`,
    {
      method: "POST",
      body: { amount: input.amountPaise, speed: "normal", notes: input.notes },
    },
    fetchImpl,
  );
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(expectedHex: string, given: string): boolean {
  const expected = Buffer.from(expectedHex, "utf8");
  const actual = Buffer.from(given, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Checkout success handler check: HMAC-SHA256 of "order_id|payment_id" with
 * the key secret must equal razorpay_signature. Constant-time compare.
 */
export function verifyRazorpayPaymentSignature(
  input: { orderId: string; paymentId: string; signature: string },
  keySecret: string,
): boolean {
  if (!input.orderId || !input.paymentId || !input.signature) return false;
  return safeEqualHex(
    hmacHex(keySecret, `${input.orderId}|${input.paymentId}`),
    input.signature,
  );
}

/** Webhook check: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
): boolean {
  if (!signature) return false;
  return safeEqualHex(hmacHex(webhookSecret, rawBody), signature);
}

/** PaymentProvider adapter (docs/ARCHITECTURE.md vendor abstraction). */
export class RazorpayProvider implements PaymentProvider {
  constructor(
    private readonly config: RazorpayConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  async createPaymentIntent(input: {
    orderId: string;
    amountInMinorUnits: number;
    currency: "INR";
  }): Promise<{ providerPaymentId: string; redirectUrl?: string }> {
    const order = await createRazorpayOrder(
      this.config,
      { amountPaise: input.amountInMinorUnits, receipt: input.orderId },
      this.fetchImpl,
    );
    return { providerPaymentId: order.id };
  }

  async verifyPayment(
    providerPaymentId: string,
  ): Promise<{ status: "SUCCEEDED" | "FAILED" | "PENDING" }> {
    const payment = await fetchRazorpayPayment(
      this.config,
      providerPaymentId,
      this.fetchImpl,
    );
    if (payment.status === "captured") return { status: "SUCCEEDED" };
    if (payment.status === "failed") return { status: "FAILED" };
    return { status: "PENDING" };
  }
}
