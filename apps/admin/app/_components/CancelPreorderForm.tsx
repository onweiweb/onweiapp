"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminInput, Field, useConfirm, useToast } from "./ui";

/**
 * Cancel a reserved pre-order. The usual way keeps what they paid as a
 * personal credit for a year; a refund is for complaints only.
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

  async function cancel(mode: "CREDIT" | "REFUND") {
    const ok = await confirm({
      title: "Cancel this pre-order?",
      message:
        mode === "CREDIT"
          ? "What they paid becomes a personal credit code for a year, emailed and sent on WhatsApp. Any held stock goes back."
          : "What they paid is refunded to their card or UPI. Any held stock goes back.",
      confirmLabel:
        mode === "CREDIT" ? "Cancel and keep as credit" : "Cancel and refund",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch(`/api/preorders/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, reason }),
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
        {canRefund ? (
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy || reason.trim().length < 2}
            onClick={() => cancel("REFUND")}
          >
            Cancel and refund instead
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
