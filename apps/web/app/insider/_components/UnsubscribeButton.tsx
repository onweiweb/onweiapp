"use client";

import { useState } from "react";
import { insiderErrorFor } from "../../../lib/messages/insider";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function unsubscribe() {
    setState("working");
    setError(null);
    try {
      const response = await fetch(
        `/api/insider/unsubscribe?t=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
      };
      if (data.ok) {
        setState("done");
        return;
      }
      setError(insiderErrorFor(data.reason));
    } catch {
      setError(insiderErrorFor("NETWORK"));
    }
    setState("idle");
  }

  if (state === "done") {
    return (
      <p
        role="status"
        className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]"
      >
        Done. You won&apos;t get Insider emails from us anymore. Your Insider
        code still works.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={unsubscribe}
        disabled={state === "working"}
        className="flex h-12 w-full items-center justify-center rounded-[31.25rem] bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.06em] text-onwei-beige disabled:opacity-60 desk:w-fit"
      >
        {state === "working" ? "One moment..." : "Unsubscribe"}
      </button>
      {error ? (
        <p
          role="alert"
          className="font-grotesk text-[length:max(0.8125rem,11px)] text-[#b91c1c]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
