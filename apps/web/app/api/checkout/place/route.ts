import { parseJsonBody, placeOrder } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom, razorpayConfig } from "../../_lib/requestAuth";
import { sendOrderEmailsInBackground } from "../../_lib/orderEmails";

// "Pay" / "Place order". The server prices the cart again; if the total
// isn't what the customer saw, nothing is created and the new total comes
// back (PRICE_CHANGED), so nobody is ever charged a surprise amount.

const bodySchema = z.object({
  addressId: z.string().min(1).max(64),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  expectedTotal: z.number().int().nonnegative(),
});

export const maxDuration = 30;

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
  const result = await placeOrder({
    customerId,
    ...parsed.data,
    razorpay: razorpayConfig(),
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, cart: result.view ?? null },
      { status: result.reason === "PAYMENT_UNAVAILABLE" ? 503 : 409 },
    );
  }
  if (result.paymentMethod === "COD")
    sendOrderEmailsInBackground(result.orderId);
  return NextResponse.json(result);
}
