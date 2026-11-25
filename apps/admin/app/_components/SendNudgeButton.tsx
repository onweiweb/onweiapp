"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, useConfirm, useToast } from "./ui";

/** "Send balance nudge" for one pre-order (order page). */
export function SendNudgeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function send() {
    const ok = await confirm({
      title: "Send the balance nudge?",
      message:
        "The customer gets an email and WhatsApp asking them to pay the balance before the due date. After this they can't cancel the pre-order themselves.",
      confirmLabel: "Send nudge",
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch("/api/preorders/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: [orderId] }),
    }).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      nudged?: number;
    } | null;
    if (!response?.ok || !data?.ok) {
      toast(data?.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast(
      data.nudged
        ? "Nudge sent. Cancelling is now closed for this customer."
        : "Already reminded or paid, nothing sent.",
      data.nudged ? "success" : "error",
    );
    router.refresh();
  }

  return (
    <AdminButton type="button" disabled={busy} onClick={send}>
      {busy ? "Sending..." : "Send balance nudge"}
    </AdminButton>
  );
}
