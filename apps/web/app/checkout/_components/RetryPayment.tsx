"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/_components/commerce/CartProvider";
import { goAfterRazorpay, openRazorpay } from "@/_components/commerce/razorpay";
import { CHECKOUT_ERRORS } from "../../../lib/messages/commerce";

const PRIMARY =
  "flex h-12 items-center justify-center rounded-full bg-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60";
const SECONDARY =
  "flex h-12 items-center justify-center rounded-full border border-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-blue";

/**
 * "Try payment again" / "Complete checkout": reopens Razorpay on the same
 * order while its hold lasts; after that, sends the customer back to
 * checkout (their bag is still there).
 */
export function RetryPayment({
  orderNumber,
  primaryLabel,
  secondary,
  prefill,
}: {
  orderNumber: string;
  primaryLabel: string;
  secondary: { label: string; href: string };
  prefill: {
    name?: string | null;
    email?: string | null;
    contact?: string | null;
  };
}) {
  const router = useRouter();
  const { refresh } = useCart();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setWorking(true);
    setError(null);
    const response = await fetch("/api/checkout/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      reason?: string;
      razorpay?: { keyId: string; orderId: string; amount: number };
    } | null;
    if (!data?.ok || !data.razorpay) {
      // The hold ran out: start again from the bag.
      router.push("/checkout");
      return;
    }
    const opened = await openRazorpay({
      ...data.razorpay,
      orderNumber,
      prefill,
      onSuccess: async (payment) => {
        const verify = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        }).catch(() => null);
        const result = (await verify?.json().catch(() => null)) as {
          ok: boolean;
        } | null;
        void refresh();
        goAfterRazorpay(
          result?.ok
            ? `/checkout/success?order=${orderNumber}`
            : `/checkout/failed?order=${orderNumber}`,
        );
      },
      onFailure: () => {
        setWorking(false);
        goAfterRazorpay(`/checkout/failed?order=${orderNumber}`);
      },
      onDismiss: () => setWorking(false),
    });
    if (!opened) {
      setWorking(false);
      setError(CHECKOUT_ERRORS.PAYMENT_UNAVAILABLE!);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retry}
          disabled={working}
          className={PRIMARY}
        >
          {working ? "Opening payment..." : primaryLabel}
        </button>
        <Link href={secondary.href} className={SECONDARY}>
          {secondary.label}
        </Link>
      </div>
      {error ? (
        <p
          role="alert"
          className="font-grotesk text-[length:max(0.75rem,11px)] text-[#b91c1c]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** While the payment is being confirmed, check back every few seconds. */
export function AutoRefresh({
  seconds = 3,
  maxTries = 10,
}: {
  seconds?: number;
  maxTries?: number;
}) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= maxTries) return;
    const timer = setTimeout(() => {
      router.refresh();
      setTries((t) => t + 1);
    }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [tries, maxTries, seconds, router]);
  return null;
}
