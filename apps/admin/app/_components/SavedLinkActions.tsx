"use client";

import { useState, useTransition } from "react";
import {
  removeLinkAction,
  type RemoveLinkResult,
} from "../analytics/links/actions";
import { AdminButton } from "./ui";

/** Copy and Remove buttons for one row in the list of links already made. */
export function SavedLinkActions({ id, url }: { id: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<RemoveLinkResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function remove() {
    startTransition(async () => {
      setResult(await removeLinkAction(id));
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p>Remove this link from the list? The link itself keeps working.</p>
        <div className="flex gap-2">
          <AdminButton type="button" onClick={remove} disabled={pending}>
            {pending ? "Removing..." : "Remove"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Keep it
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <AdminButton type="button" variant="secondary" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => setConfirming(true)}
        >
          Remove
        </AdminButton>
      </div>
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-red-700">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
