"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminInput, Field, useConfirm, useToast } from "./ui";

const rupeesText = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Cancel a reserved pre-order. The usual way keeps what they paid as a
 * personal credit for a year; a cash refund is for complaints only and, when
 * Settings say so, keeps the payment gateway fee (staff can change it).
 */
export function CancelPreorderForm({
  orderId,
  canRefund,
}: {
  orderId: string;
  canRefund: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  // Cash refund: the amount box, filled in from the reserve minus the fee.
  const [refund, setRefund] = useState<{
    amount: string;
    note: string;
  } | null>(null);

  async function startRefund() {
    setBusy(true);
    const response = await fetch(
      `/api/preorders/orders/${orderId}/refund`,
    ).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      reserve?: number;
      gatewayFee?: number | null;
      suggested?: number;
      keepsFee?: boolean;
    } | null;
    if (!response?.ok || !data?.ok || data.suggested === undefined) {
      toast(data?.error ?? "Couldn't work out the refund. Try again.", "error");
      return;
    }
    const reserve = data.reserve ?? 0;
    setRefund({
      amount: String(data.suggested / 100),
      note:
        data.keepsFee &&
        data.gatewayFee !== null &&
        data.gatewayFee !== undefined
          ? `${rupeesText(reserve)} reserve minus ${rupeesText(data.gatewayFee)} payment fee Razorpay kept. Change it to refund more or less.`
          : data.keepsFee
            ? `Razorpay didn't say what fee it kept, so this is the whole ${rupeesText(reserve)} reserve.`
            : `The whole ${rupeesText(reserve)} reserve (Settings say refunds don't keep the payment fee).`,
    });
  }

  async function cancel(mode: "CREDIT" | "REFUND") {
    const refundAmount =
      mode === "REFUND" && refund ? Number(refund.amount) : undefined;
    if (
      mode === "REFUND" &&
      (refundAmount === undefined || !(refundAmount >= 0))
    ) {
      toast("Enter the amount to refund, in rupees.", "error");
      return;
    }
    const ok = await confirm({
      title: "Cancel this pre-order?",
      message:
        mode === "CREDIT"
          ? "What they paid becomes a personal credit code for a year, emailed and sent on WhatsApp. Any held stock goes back."
          : `₹${refundAmount?.toLocaleString("en-IN")} is refunded to their card or UPI. Any held stock goes back.`,
      confirmLabel:
        mode === "CREDIT" ? "Cancel and keep as credit" : "Cancel and refund",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch(`/api/preorders/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "REFUND" ? { mode, reason, refundAmount } : { mode, reason },
      ),
    }).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      creditCode?: string | null;
    } | null;
    if (!response?.ok || !data?.ok) {
      toast(data?.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast(
      data.creditCode
        ? `Cancelled. Credit ${data.creditCode} sent to the customer.`
        : "Cancelled and refunded.",
      "success",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 border-t border-onwei-blue/10 pt-3">
      <Field label="Why is it being cancelled?" hint="Saved on the order.">
        <AdminInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busy || reason.trim().length < 2}
          onClick={() => cancel("CREDIT")}
        >
          Cancel, keep as credit
        </AdminButton>
        {canRefund && !refund ? (
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy || reason.trim().length < 2}
            onClick={startRefund}
          >
            Cancel and refund instead
          </AdminButton>
        ) : null}
      </div>
      {refund ? (
        <div className="flex flex-col gap-2 rounded-[20px] border border-onwei-blue/15 p-4">
          <Field label="Refund (₹)" hint={refund.note}>
            <AdminInput
              type="number"
              min={0}
              step="0.01"
              value={refund.amount}
              onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              type="button"
              variant="danger"
              disabled={busy || reason.trim().length < 2}
              onClick={() => cancel("REFUND")}
            >
              Cancel and refund
            </AdminButton>
            <AdminButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setRefund(null)}
            >
              Back
            </AdminButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
