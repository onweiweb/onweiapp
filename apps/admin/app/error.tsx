"use client";

import { useRouter } from "next/navigation";
import { AdminButton } from "./_components/ui/AdminButton";

// No root error.tsx existed at all -- an unhandled render error in the CMS
// crashed to Next's default error screen with no way back for staff.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold text-onwei-blue">
        Something went wrong
      </p>
      <p className="max-w-md text-sm text-onwei-blue/70">
        This page hit an unexpected error. Try again, or go back to the
        dashboard. If it keeps happening, tell engineering
        {error.digest ? ` (reference: ${error.digest})` : ""}.
      </p>
      <div className="flex items-center gap-3">
        <AdminButton onClick={reset}>Try again</AdminButton>
        <AdminButton variant="secondary" onClick={() => router.push("/")}>
          Go to dashboard
        </AdminButton>
      </div>
    </div>
  );
}
