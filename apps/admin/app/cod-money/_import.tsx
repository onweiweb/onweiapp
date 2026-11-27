"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, useToast } from "../_components/ui";

/** "Update from iThink": reads the last 14 days of COD payouts. */
export function ImportCodButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const result = await fetch("/api/cod-money/import", { method: "POST" })
      .then(
        (r) =>
          r.json() as Promise<{
            ok: boolean;
            error?: string;
            message?: string;
          }>,
      )
      .catch((): { ok: boolean; error?: string; message?: string } => ({
        ok: false,
        error: "Something went wrong. Check your connection and try again.",
      }));
    setBusy(false);
    toast(
      result.ok
        ? (result.message ?? "Updated.")
        : (result.error ?? "That didn't work."),
      result.ok ? "success" : "error",
    );
    router.refresh();
  }

  return (
    <AdminButton type="button" disabled={busy} onClick={run}>
      {busy ? "Reading payouts..." : "Update from iThink"}
    </AdminButton>
  );
}
