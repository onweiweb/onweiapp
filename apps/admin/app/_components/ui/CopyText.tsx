"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "./AdminFeedback";

/**
 * Long text in a table cell: one line, cut off with "...", the full text on
 * hover, and a button that copies it.
 */
export function CopyText({
  text,
  display,
  label,
  className = "max-w-[28rem]",
}: {
  /** What the button copies. */
  text: string;
  /** What the cell shows, when it differs from what is copied. */
  display?: string;
  /** What is copied, for the button's name and the toast, e.g. "address". */
  label: string;
  className?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(
        "Couldn't copy. Allow clipboard access in the browser and try again.",
        "error",
      );
    }
  }

  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="min-w-0 truncate" title={display ?? text}>
        {display ?? text}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
        className="shrink-0 rounded-md p-1 text-onwei-blue/60 hover:bg-onwei-beige hover:text-onwei-blue"
      >
        {copied ? (
          <Check size={14} aria-hidden />
        ) : (
          <Copy size={14} aria-hidden />
        )}
      </button>
    </span>
  );
}
