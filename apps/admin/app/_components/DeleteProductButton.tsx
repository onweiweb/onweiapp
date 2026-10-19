"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, useConfirm, useToast } from "./ui";

/**
 * Deletes a product after asking. It is hidden from the store and from the
 * admin lists, but the row stays in the database so past orders and reports
 * still make sense.
 */
export function DeleteProductButton({
  productId,
  productName,
  redirectTo,
  compact = false,
}: {
  productId: string;
  productName: string;
  /** Where to go after deleting. Leave out to stay on the list and refresh it. */
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${productName}?`,
      message:
        "It will disappear from the store and from this list. Past orders keep their details. Anyone opening the old link lands on the category page instead.",
      confirmLabel: "Delete product",
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        toast(data.error ?? "Couldn't delete that product.", "error");
        return;
      }
      toast("Product deleted.");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      toast("Couldn't delete that product. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminButton
      type="button"
      variant="danger"
      disabled={busy}
      onClick={handleDelete}
      className={compact ? "!px-3 !py-1 text-xs" : undefined}
    >
      {busy ? "Deleting..." : "Delete"}
    </AdminButton>
  );
}
