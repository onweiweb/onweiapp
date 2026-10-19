"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, useConfirm } from "./ui";

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
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function act(action: "approve" | "reject") {
    const confirmed =
      action === "approve"
        ? await confirm({
            title: "Approve this return?",
            message: `This will add ${quantity} unit${quantity === 1 ? "" : "s"} of ${sku} back to stock.`,
            confirmLabel: "Approve",
          })
        : await confirm({
            title: "Reject this return?",
            message: "No stock will be added back.",
            confirmLabel: "Reject",
            danger: true,
          });
    if (!confirmed) return;

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
