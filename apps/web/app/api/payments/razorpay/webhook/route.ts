import {
  confirmRazorpayPayment,
  markPaymentFailed,
  markRefundStatus,
  verifyRazorpayWebhookSignature,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { razorpayConfig } from "../../../_lib/requestAuth";
import { sendOrderEmailsInBackground } from "../../../_lib/orderEmails";

// Razorpay webhook. Set it up in the Razorpay dashboard with this URL and
// the events payment.authorized, payment.captured, payment.failed,
// order.paid, refund.processed and refund.failed, and put the secret you choose in RAZORPAY_WEBHOOK_SECRET.
// Every event is safe to receive twice.

interface PaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  method?: string;
  status: string;
  error_description?: string | null;
}

export async function POST(request: Request) {
  const config = razorpayConfig();
  const secret = config?.webhookSecret;
  if (!config || !secret) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > 256 * 1024)
    return NextResponse.json({ ok: false }, { status: 413 });
  if (
    !verifyRazorpayWebhookSignature(
      raw,
      request.headers.get("x-razorpay-signature"),
      secret,
    )
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: PaymentEntity };
      refund?: { entity?: { id: string; status: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  switch (event.event) {
    case "payment.authorized":
    case "payment.captured":
    case "order.paid":
      if (payment?.order_id) {
        // Reads the payment from Razorpay, captures it if only authorized,
        // and confirms the order once (repeats do nothing).
        const paid = await confirmRazorpayPayment({
          razorpayOrderId: payment.order_id,
          paymentId: payment.id,
          razorpay: config,
        });
        if (paid.ok && paid.status === "CONFIRMED")
          sendOrderEmailsInBackground(paid.orderId);
      }
      break;
    case "payment.failed":
      if (payment?.order_id) {
        await markPaymentFailed({
          razorpayOrderId: payment.order_id,
          paymentId: payment.id,
          amountPaise: payment.amount,
          method: payment.method ?? null,
          reason: payment.error_description ?? null,
        });
      }
      break;
    case "refund.processed":
    case "refund.failed": {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        await markRefundStatus(
          refund.id,
          event.event === "refund.processed" ? "PROCESSED" : "FAILED",
        );
      }
      break;
    }
  }
  return NextResponse.json({ ok: true });
}
