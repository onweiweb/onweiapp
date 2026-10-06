"use client";

import { useLinkStatus } from "next/link";

/**
 * Put inside a <Link>. Shows a small spinner while that link's page is
 * loading, so a click never feels ignored.
 */
export function PendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      role="status"
      aria-label="Loading"
      className="ml-auto inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
