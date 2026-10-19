"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput, AdminSelect, useToast } from "./ui";

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
  const toast = useToast();
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
      setError("Enter a number other than zero, like 10 or -2.");
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
        return;
      }
      setDelta("");
      toast("Stock updated.");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <AdminInput
          type="number"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          placeholder="+/-"
          aria-label="Change in stock"
          className="!h-9 w-20 text-center"
        />
        <AdminSelect
          value={reason}
          onChange={(event) => setReason(event.target.value as typeof reason)}
          aria-label="Reason"
          className="!h-9"
        >
          {REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
        <AdminButton
          type="submit"
          disabled={submitting}
          className="!px-4 !py-1.5 text-xs"
        >
          {submitting ? "Saving..." : "Apply"}
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </form>
  );
}
