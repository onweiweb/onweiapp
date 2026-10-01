"use client";

import Link from "next/link";

// No root error.tsx existed at all -- an unhandled render error crashed to
// Next's default (unstyled, off-brand) error screen with no way back.
// Deliberately minimal, not a Figma-matched design: this file's whole job
// is "don't show a dead end," not a storefront screen, and CLAUDE.md's
// Figma-strict rule needs explicit sign-off before inventing a real design
// for a new screen -- flag that separately rather than build one here.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-[1.75rem] font-bold uppercase text-onwei-blue">
        Something went wrong
      </p>
      <p className="max-w-md font-grotesk text-[length:max(0.875rem,11px)] text-onwei-blue/70">
        That page hit an unexpected error. Try again, or head back to the
        homepage.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase text-onwei-beige"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-[1.875rem] border border-onwei-blue px-6 py-3 font-grotesk text-label uppercase text-onwei-blue"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
