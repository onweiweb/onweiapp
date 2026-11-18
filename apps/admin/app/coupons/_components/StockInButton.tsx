"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, useConfirm, useToast } from "../../_components/ui";

/** "Stock is in, ask for balance" for one product. */
export function StockInButton({
  productId,
  name,
  waiting,
  stock,
}: {
  productId: string;
  name: string;
  waiting: number;
  stock: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function run() {
    const ok = await confirm({
      title: `Ask for the balance on ${name}?`,
      message: `${waiting} item${waiting === 1 ? " is" : "s are"} waiting and ${stock} ${stock === 1 ? "is" : "are"} in stock. Oldest reservations go first: their stock is held and each customer gets an email and WhatsApp with a link to pay the rest. Anyone beyond the stock keeps waiting.`,
      confirmLabel: "Ask for balance",
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch("/api/preorders/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      asked?: number;
      confirmed?: number;
      waiting?: number;
      missingGifts?: number;
      failed?: number;
    } | null;
    if (!response?.ok || !data?.ok) {
      toast(data?.error ?? "That didn't work. Try again.", "error");
      return;
    }
    const parts = [
      `${data.asked ?? 0} asked to pay`,
      data.confirmed ? `${data.confirmed} had nothing left to pay` : "",
      data.waiting ? `${data.waiting} still waiting for stock` : "",
      data.missingGifts
        ? `${data.missingGifts} free items out of stock (flagged on the orders)`
        : "",
      data.failed ? `${data.failed} couldn't start a payment, try again` : "",
    ].filter(Boolean);
    toast(`${parts.join(". ")}.`, data.failed ? "error" : "success");
    router.refresh();
  }

  return (
    <AdminButton
      type="button"
      disabled={busy || waiting === 0 || stock === 0}
      onClick={run}
    >
      {busy ? "Working..." : "Stock is in, ask for balance"}
    </AdminButton>
  );
}
