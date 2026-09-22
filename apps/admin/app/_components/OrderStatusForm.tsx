"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@onwei/database";
import { AdminButton, AdminSelect } from "./ui";

export function OrderStatusForm({
  orderId,
  nextStatuses,
  statusLabels,
}: {
  orderId: string;
  nextStatuses: readonly OrderStatus[];
  statusLabels: Record<OrderStatus, string>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | "">(nextStatuses[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (nextStatuses.length === 0) {
    return (
      <p className="text-sm text-onwei-blue/60">
        This order is in a final state — there&apos;s nothing left to move it
        to.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return;

    const label = statusLabels[status];
    if (
      !window.confirm(
        `This will mark the order as "${label}". This can't be undone from here — make sure that's correct.`,
      )
    ) {
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <AdminSelect
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
        >
          {nextStatuses.map((option) => (
            <option key={option} value={option}>
              {statusLabels[option]}
            </option>
          ))}
        </AdminSelect>
        <AdminButton type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Update status"}
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </form>
  );
}
