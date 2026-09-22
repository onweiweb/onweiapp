"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "./ui";

export function ReviewModerationButtons({
  reviewId,
  isApproved,
}: {
  reviewId: string;
  isApproved: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function act(action: "approve" | "reject") {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/${action}`, {
        method: "POST",
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {!isApproved ? (
          <AdminButton
            type="button"
            disabled={submitting}
            onClick={() => act("approve")}
          >
            Approve
          </AdminButton>
        ) : (
          <AdminButton
            type="button"
            variant="danger"
            disabled={submitting}
            onClick={() => act("reject")}
          >
            Unpublish
          </AdminButton>
        )}
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
