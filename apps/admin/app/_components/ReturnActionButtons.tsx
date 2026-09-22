"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "./ui";

export function ReturnActionButtons({
  returnRequestId,
  sku,
  quantity,
}: {
  returnRequestId: string;
  sku: string;
  quantity: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function act(action: "approve" | "reject") {
    if (action === "approve") {
      const confirmed = window.confirm(
        `This will add ${quantity} unit${quantity === 1 ? "" : "s"} of ${sku} back to stock.`,
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        "This will reject the return — no stock will be added back.",
      );
      if (!confirmed) return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/returns/${returnRequestId}/${action}`,
        { method: "POST" },
      );
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <AdminButton
          type="button"
          disabled={submitting}
          onClick={() => act("approve")}
        >
          Approve
        </AdminButton>
        <AdminButton
          type="button"
          variant="danger"
          disabled={submitting}
          onClick={() => act("reject")}
        >
          Reject
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
