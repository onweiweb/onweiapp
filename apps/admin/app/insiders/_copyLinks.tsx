"use client";

import { useState } from "react";
import { AdminButton } from "../_components/ui";

type Copied = "link" | "message" | "failed" | null;

/** Copy link and Copy message buttons for one row of Insiders > Members. */
export function CopyAddressLink({
  url,
  message,
}: {
  url: string;
  message: string;
}) {
  const [copied, setCopied] = useState<Copied>(null);

  async function copy(text: string, what: "link" | "message") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => copy(url, "link")}
          title="Copies only the link to their address form"
        >
          {copied === "link" ? "Copied" : "Copy link"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => copy(message, "message")}
          title="Copies a short WhatsApp message with their code and the link"
        >
          {copied === "message" ? "Copied" : "Copy message"}
        </AdminButton>
      </div>
      {copied === "failed" ? (
        <p role="alert" className="text-xs text-red-700">
          Couldn&apos;t copy. Try again, or allow clipboard access in the
          browser.
        </p>
      ) : null}
    </div>
  );
}
