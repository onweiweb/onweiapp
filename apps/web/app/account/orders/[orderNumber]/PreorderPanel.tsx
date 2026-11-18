"use client";

import type { OrderPreorderInfo } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { goAfterRazorpay, openRazorpay } from "@/_components/commerce/razorpay";
import { track } from "../../../../lib/analytics/track";
import { PREORDER_ERRORS, rupees } from "../../../../lib/messages/commerce";
import { Card } from "../../../checkout/_components/parts";

const PRIMARY =
  "flex h-12 items-center justify-center rounded-full bg-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60";
const SECONDARY =
  "flex h-12 items-center justify-center rounded-full border border-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-blue disabled:opacity-60";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/**
 * A pre-order on the account page: where it's up to, "Pay the balance" once
 * it's ready, "Cancel and keep as credit" before that is paid, and the credit
 * code after a cancel. No Figma frame; built in the checkout style.
 */
export function PreorderPanel({
  orderNumber,
  info,
  prefill,
}: {
  orderNumber: string;
  info: OrderPreorderInfo;
  prefill: {
    name?: string | null;
    email?: string | null;
    contact?: string | null;
  };
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancellable = info.stage === "WAITING" || info.stage === "DUE";

  async function payBalance() {
    setWorking(true);
    setError(null);
    const response = await fetch("/api/preorder/balance", {
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
      setWorking(false);
      setError(
        PREORDER_ERRORS[data?.reason ?? "NETWORK"] ?? PREORDER_ERRORS.NETWORK!,
      );
      return;
    }
    const opened = await openRazorpay({
      keyId: data.razorpay.keyId,
      orderId: data.razorpay.orderId,
      amount: data.razorpay.amount,
      orderNumber,
      prefill,
      onSuccess: async (payment) => {
        await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        }).catch(() => null);
        track("preorder_balance_paid", { order_number: orderNumber });
        goAfterRazorpay(`/checkout/success?order=${orderNumber}`);
      },
      onFailure: () => {
        setWorking(false);
        setError(
          "That payment didn't go through. Nothing was taken; try again.",
        );
      },
      onDismiss: () => setWorking(false),
    });
    if (!opened) {
      setWorking(false);
      setError(PREORDER_ERRORS.PAYMENT_UNAVAILABLE!);
    }
  }

  async function cancel() {
    setWorking(true);
    setError(null);
    const response = await fetch("/api/preorder/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      reason?: string;
    } | null;
    setWorking(false);
    if (!data?.ok) {
      setError(
        PREORDER_ERRORS[data?.reason ?? "NETWORK"] ?? PREORDER_ERRORS.NETWORK!,
      );
      return;
    }
    setConfirmCancel(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
          Pre-order{info.tierLabel ? `, ${info.tierLabel}` : ""}
        </h2>
        <span className="rounded-full bg-onwei-green px-3 py-0.5 font-grotesk text-[length:max(0.6875rem,10px)] uppercase">
          {info.stage === "DUE"
            ? "Ready to ship"
            : info.stage === "WAITING"
              ? "Reserved"
              : info.stage === "PAID"
                ? "Fully paid"
                : info.stage === "CANCELLED"
                  ? "Cancelled"
                  : "Waiting for payment"}
        </span>
      </div>
      <dl className="flex flex-col gap-1.5 font-grotesk text-[length:max(0.8125rem,11px)]">
        <div className="flex justify-between gap-3">
          <dt>Paid when you reserved</dt>
          <dd>{rupees(info.reserveTotal)}</dd>
        </div>
        <div className="flex justify-between gap-3 font-bold">
          <dt>{info.stage === "PAID" ? "Balance paid" : "Balance"}</dt>
          <dd>{rupees(info.balanceDue)}</dd>
        </div>
      </dl>

      {info.stage === "WAITING" ? (
        <p className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.6]">
          Your price and gifts are locked in. We&apos;ll email and WhatsApp you
          when it&apos;s ready to ship
          {info.expectedShipDate
            ? ` (expected around ${DATE.format(new Date(info.expectedShipDate))})`
            : ""}
          , then you pay the balance.
        </p>
      ) : null}
      {info.stage === "DUE" ? (
        <>
          <p className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.6]">
            It&apos;s ready. Pay the balance and we&apos;ll send it out straight
            away.
            {info.creditAfter
              ? ` If it isn't paid by ${DATE.format(new Date(info.creditAfter))}, what you paid stays with you as credit for a year.`
              : ""}
          </p>
          <button
            type="button"
            disabled={working}
            onClick={payBalance}
            className={PRIMARY}
          >
            {working ? "Opening payment..." : `Pay ${rupees(info.balanceDue)}`}
          </button>
        </>
      ) : null}
      {info.stage === "CANCELLED" && info.creditCode ? (
        <div className="rounded-[1rem] bg-onwei-green p-4 font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.6]">
          Your {rupees(info.reserveTotal)} is credit on your account. Use code{" "}
          <strong>{info.creditCode}</strong> at checkout
          {info.creditEndsAt
            ? ` until ${DATE.format(new Date(info.creditEndsAt))}`
            : ""}
          . Anything left over stays for next time.
        </div>
      ) : null}

      {cancellable ? (
        confirmCancel ? (
          <div className="flex flex-col gap-3 rounded-[1rem] border border-onwei-blue p-4">
            <p className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.6]">
              Cancel this pre-order? The {rupees(info.reserveTotal)} you paid
              becomes a credit code for a year, for any order or pre-order. Your
              locked price and gifts are lost.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={working}
                onClick={cancel}
                className={SECONDARY}
              >
                {working ? "Cancelling..." : "Yes, cancel and keep as credit"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
              >
                Keep my pre-order
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="w-fit font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
          >
            Cancel and keep as credit
          </button>
        )
      ) : null}
      {error ? (
        <p
          role="alert"
          className="font-grotesk text-[length:max(0.8125rem,11px)] text-[#b91c1c]"
        >
          {error}
        </p>
      ) : null}
    </Card>
  );
}
