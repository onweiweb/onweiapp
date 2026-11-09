"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, useToast } from "../../_components/ui";

export function MessageStatusButton({
  id,
  status,
}: {
  id: string;
  status: "NEW" | "REPLIED";
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const next = status === "NEW" ? "REPLIED" : "NEW";

  return (
    <AdminButton
      type="button"
      variant={status === "NEW" ? "primary" : "secondary"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const response = await fetch(`/api/messages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        }).catch(() => null);
        setBusy(false);
        if (!response?.ok)
          return toast("That didn't work. Refresh and try again.", "error");
        toast(
          next === "REPLIED" ? "Marked as replied." : "Moved back to To reply.",
          "success",
        );
        router.refresh();
      }}
    >
      {status === "NEW" ? "Mark as replied" : "Move back to To reply"}
    </AdminButton>
  );
}
