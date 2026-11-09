"use client";

import type { OrderDetailItem } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { RETURN_ERRORS, rupees } from "../../../../lib/messages/commerce";

export function ReturnForm({
  orderNumber,
  items,
  reasons,
  allowRefund,
  allowExchange,
  isCod,
  conditionNote,
  shippingNote,
  windowEnds,
}: {
  orderNumber: string;
  items: OrderDetailItem[];
  reasons: string[];
  allowRefund: boolean;
  allowExchange: boolean;
  isCod: boolean;
  conditionNote: string;
  shippingNote: string;
  windowEnds: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<"REFUND" | "EXCHANGE">(
    allowRefund ? "REFUND" : "EXCHANGE",
  );
  const [note, setNote] = useState("");
  const [upi, setUpi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const reasonId = useId();
  const upiId = useId();
  const noteId = useId();

  const returnable = items.filter((item) => item.returnableQuantity > 0);
  if (returnable.length === 0) return null;
  if (done) {
    return (
      <p
        role="status"
        className="rounded-[1.25rem] bg-onwei-blue px-5 py-4 font-grotesk text-[length:max(0.875rem,12px)] text-onwei-beige"
      >
        Got it. We&apos;ll check your request within a day and email you the
        next steps.
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-full border border-onwei-blue px-6 py-3 font-grotesk text-[length:max(0.8125rem,11px)] uppercase"
      >
        Return items
      </button>
    );
  }

  // An estimate for the customer; the server works out the exact amount.
  const estimate = returnable.reduce(
    (sum, item) =>
      sum + Math.floor((item.total * (qty[item.id] ?? 0)) / item.quantity),
    0,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const response = await fetch("/api/account/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber,
        items: Object.entries(qty).map(([orderItemId, quantity]) => ({
          orderItemId,
          quantity,
        })),
        reason,
        resolution,
        note: note || undefined,
        payoutUpi: upi || undefined,
      }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      reason?: string;
    } | null;
    setSending(false);
    if (!data?.ok) {
      setError(
        RETURN_ERRORS[data?.reason ?? "NETWORK"] ?? RETURN_ERRORS.NETWORK!,
      );
      return;
    }
    setDone(true);
    router.refresh();
  }

  const label =
    "font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]";
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-[1.5rem] border border-onwei-blue bg-onwei-white p-5 desk:p-7"
    >
      <div>
        <h2 className="font-display text-[length:max(1.25rem,16px)] font-bold">
          Return items
        </h2>
        {windowEnds ? (
          <p className="font-grotesk text-[length:max(0.75rem,11px)]">
            You can ask until {windowEnds}.
          </p>
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className={label}>What are you sending back?</legend>
        {returnable.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-[1rem] border border-onwei-blue/30 p-3"
          >
            <span className="font-grotesk text-[length:max(0.8125rem,11px)]">
              {item.productName}
              {item.variantLabel ? ` (${item.variantLabel})` : ""}
            </span>
            <label className="flex items-center gap-2 font-grotesk text-[length:max(0.75rem,11px)]">
              Qty
              <select
                value={qty[item.id] ?? 0}
                onChange={(event) =>
                  setQty((q) => ({
                    ...q,
                    [item.id]: Number(event.target.value),
                  }))
                }
                className="h-9 rounded-full border border-onwei-blue bg-onwei-white px-3"
              >
                {Array.from({ length: item.returnableQuantity + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className={label}>
          Why?
        </label>
        <select
          id={reasonId}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-11 rounded-full border border-onwei-blue bg-onwei-white px-4 font-grotesk"
        >
          <option value="">Pick a reason</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {allowRefund && allowExchange ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={label}>What would you like?</legend>
          {(["REFUND", "EXCHANGE"] as const).map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 font-grotesk text-[length:max(0.875rem,12px)]"
            >
              <input
                type="radio"
                name="resolution"
                checked={resolution === option}
                onChange={() => setResolution(option)}
                className="accent-onwei-blue"
              />
              {option === "REFUND"
                ? "My money back"
                : "A different size or colour"}
            </label>
          ))}
        </fieldset>
      ) : null}
      {resolution === "REFUND" && isCod ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={upiId} className={label}>
            Your UPI ID, for the refund
          </label>
          <input
            id={upiId}
            value={upi}
            onChange={(event) => setUpi(event.target.value.trim())}
            placeholder="name@okaxis"
            className="h-11 rounded-full border border-onwei-blue bg-onwei-white px-4 font-grotesk text-[length:max(0.9375rem,16px)]"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className={label}>
          Anything else? (optional)
        </label>
        <textarea
          id={noteId}
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="rounded-[1rem] border border-onwei-blue bg-onwei-white p-3 font-grotesk text-[length:max(0.9375rem,16px)]"
        />
      </div>
      <div className="rounded-[1rem] bg-onwei-beige p-4 font-grotesk text-[length:max(0.75rem,11px)] leading-[1.5]">
        <p>{conditionNote}</p>
        <p>{shippingNote}</p>
        {resolution === "REFUND" && estimate > 0 ? (
          <p className="mt-2 font-bold">
            You&apos;ll get back about {rupees(estimate)} (what you paid for
            these, after discounts)
            {isCod ? ", to your UPI ID" : ", to the way you paid"}.
          </p>
        ) : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="font-grotesk text-[length:max(0.8125rem,11px)] text-[#b91c1c]"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-onwei-blue px-7 py-3 font-grotesk text-[length:max(0.8125rem,11px)] uppercase text-onwei-beige disabled:opacity-60"
        >
          {sending ? "Sending..." : "Ask for a return"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-onwei-blue px-7 py-3 font-grotesk text-[length:max(0.8125rem,11px)] uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
