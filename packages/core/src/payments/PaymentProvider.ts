/**
 * Vendor-abstraction interface for the payment gateway (docs/ARCHITECTURE.md).
 * Razorpay was chosen on 2026-11-09 (docs/COMMERCE_BUILD_PLAN.md); its
 * adapter is RazorpayProvider in ./razorpay.ts.
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
