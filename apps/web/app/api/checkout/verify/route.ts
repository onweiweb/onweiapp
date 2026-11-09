import {
  confirmRazorpayPayment,
  parseJsonBody,
  verifyRazorpayPaymentSignature,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom, razorpayConfig } from "../../_lib/requestAuth";
import { sendOrderEmailsInBackground } from "../../_lib/orderEmails";

// Razorpay checkout's success handler posts here. The signature proves the
// payment belongs to our order; the amount and status come from Razorpay
// itself, never from the browser. The webhook does the same job, so if this
// call is lost the order is still confirmed.

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId) {
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  }
  const config = razorpayConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, reason: "PAYMENT_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;
  const valid = verifyRazorpayPaymentSignature(
    {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    },
    config.keySecret,
  );
  if (!valid) {
    return NextResponse.json(
      { ok: false, reason: "SIGNATURE_MISMATCH" },
      { status: 400 },
    );
  }

  const result = await confirmRazorpayPayment({
    razorpayOrderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    razorpay: config,
  });
  if (!result.ok) {
    if (result.reason === "PROVIDER_ERROR") {
      // The webhook will confirm it; tell the page to check back.
      return NextResponse.json({ ok: true, status: "PROCESSING" });
    }
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 409 },
    );
  }
  if (!("orderId" in result)) {
    return result.status === "FAILED"
      ? NextResponse.json(
          { ok: false, reason: "PAYMENT_FAILED" },
          { status: 402 },
        )
      : NextResponse.json({ ok: true, status: "PROCESSING" });
  }
  if (result.status === "CONFIRMED")
    sendOrderEmailsInBackground(result.orderId);
  return NextResponse.json({
    ok: true,
    status: result.status,
    orderNumber: result.orderNumber,
  });
}
