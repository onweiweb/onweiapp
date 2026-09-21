/**
 * Vendor-abstraction interface for the payment gateway (docs/ARCHITECTURE.md).
 * No adapter exists yet — the gateway itself is still an open decision
 * (docs/OPEN_DECISIONS.md: Razorpay is the leading candidate, not confirmed).
 * Do not implement a concrete adapter until that decision is made.
 */
export interface PaymentProvider {
  createPaymentIntent(input: {
    orderId: string;
    amountInMinorUnits: number;
    currency: "INR";
  }): Promise<{ providerPaymentId: string; redirectUrl?: string }>;

  verifyPayment(
    providerPaymentId: string,
  ): Promise<{ status: "SUCCEEDED" | "FAILED" | "PENDING" }>;
}
