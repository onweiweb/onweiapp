"use client";

// Loads Razorpay Standard Checkout (checkout.js) once and opens it.

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error?: { description?: string; reason?: string };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailure) => void,
  ) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Razorpay steps the browser back when its window closes, which would undo a
 * client-side route change made at the same moment. A short pause and a full
 * page load make the move stick.
 */
export function goAfterRazorpay(url: string): void {
  setTimeout(() => window.location.assign(url), 400);
}

export async function openRazorpay(input: {
  keyId: string;
  orderId: string;
  amount: number;
  orderNumber: string;
  prefill: {
    name?: string | null;
    email?: string | null;
    contact?: string | null;
  };
  onSuccess: (response: RazorpaySuccess) => void;
  onFailure: (reason: string) => void;
  onDismiss: () => void;
}): Promise<boolean> {
  const ready = await loadRazorpay();
  if (!ready || !window.Razorpay) return false;
  // A failed attempt keeps Razorpay's window open: it offers its own "try
  // another way" screen. Only when the customer closes it do we decide
  // where to go: the failed page if an attempt failed, otherwise the
  // "checkout not completed" page.
  let paid = false;
  let failedReason: string | null = null;
  const rzp = new window.Razorpay({
    key: input.keyId,
    order_id: input.orderId,
    amount: input.amount,
    currency: "INR",
    name: "Onwei",
    description: `Order ${input.orderNumber}`,
    prefill: {
      name: input.prefill.name ?? undefined,
      email: input.prefill.email ?? undefined,
      contact: input.prefill.contact ?? undefined,
    },
    theme: { color: "#161845" },
    handler: (response: RazorpaySuccess) => {
      paid = true;
      input.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        if (paid) return;
        if (failedReason) input.onFailure(failedReason);
        else input.onDismiss();
      },
    },
  });
  rzp.on("payment.failed", (response) => {
    failedReason = response.error?.description ?? "Payment didn't go through";
  });
  rzp.open();
  return true;
}
