import { getRazorpayConfig, type RazorpayConfig } from "@onwei/core";

/** Razorpay keys for refunds (same keys as the storefront). */
export function razorpayConfig(): RazorpayConfig | null {
  return getRazorpayConfig(process.env);
}
