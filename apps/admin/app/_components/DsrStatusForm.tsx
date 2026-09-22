"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DsrStatus } from "@onwei/database";
import { AdminButton, AdminSelect } from "./ui";
import { DSR_STATUS_LABELS } from "../_lib/complianceLabels";

const NEXT_STATUSES: Record<DsrStatus, DsrStatus[]> = {
  RECEIVED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["FULFILLED", "REJECTED"],
  FULFILLED: [],
  REJECTED: [],
};

const CONSEQUENCE_COPY: Partial<Record<DsrStatus, string>> = {
  FULFILLED:
    "This marks the request as fulfilled — make sure the data has actually been provided/corrected/deleted first.",
  REJECTED: "This closes the request without fulfilling it.",
};

export function DsrStatusForm({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: DsrStatus;
}) {
  const router = useRouter();
  const options = NEXT_STATUSES[currentStatus];
  const [status, setStatus] = useState<DsrStatus | "">(options[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (options.length === 0) {
    return (
      <p className="text-sm text-onwei-blue/60">
        This request is closed — there&apos;s nothing left to do.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return;

    const consequence = CONSEQUENCE_COPY[status];
    if (consequence && !window.confirm(consequence)) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/dsr/${requestId}/status`, {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <AdminSelect
          value={status}
          onChange={(event) => setStatus(event.target.value as DsrStatus)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {DSR_STATUS_LABELS[option]}
            </option>
          ))}
        </AdminSelect>
        <AdminButton type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Update"}
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </form>
  );
}
