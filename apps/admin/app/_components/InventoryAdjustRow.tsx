"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASON_OPTIONS = [
  { value: "RESTOCK", label: "Restock" },
  { value: "RETURN", label: "Customer return" },
  { value: "ADJUSTMENT", label: "Correction (damaged, miscount, etc.)" },
] as const;

export function InventoryAdjustRow({
  productVariantId,
  warehouseId,
}: {
  productVariantId: string;
  warehouseId: string;
}) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] =
    useState<(typeof REASON_OPTIONS)[number]["value"]>("RESTOCK");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedDelta = Number(delta);
    if (!delta || Number.isNaN(parsedDelta) || parsedDelta === 0) {
      setError("Enter a non-zero amount.");
      return;
    }
    setSubmitting(true);

    try {
      const response = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId,
          warehouseId,
          delta: parsedDelta,
          reason,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setDelta("");
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          placeholder="+/-"
          className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as typeof reason)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          {REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-2 py-1 text-sm text-white disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Apply"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
