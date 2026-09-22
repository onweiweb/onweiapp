"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "./ui";

export function StaffStatusToggle({
  staffUserId,
  isActive,
  isViewingOwnAccount,
}: {
  staffUserId: string;
  isActive: boolean;
  isViewingOwnAccount: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isViewingOwnAccount) {
    return (
      <p className="text-sm text-onwei-blue/60">
        You can&apos;t deactivate your own account — ask another admin to do it.
      </p>
    );
  }

  async function handleClick() {
    const nextIsActive = !isActive;
    const confirmed = window.confirm(
      nextIsActive
        ? "This will let this person sign in again."
        : "This will sign this person out and block them from signing in again.",
    );
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/staff/${staffUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextIsActive }),
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
      <AdminButton
        type="button"
        variant={isActive ? "danger" : "primary"}
        disabled={submitting}
        onClick={handleClick}
      >
        {isActive ? "Deactivate" : "Reactivate"}
      </AdminButton>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
