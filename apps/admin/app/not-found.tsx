import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold text-onwei-blue">Page not found</p>
      <p className="max-w-md text-sm text-onwei-blue/70">
        This page does not exist, or it may have been removed.
      </p>
      <Link href="/" className="text-sm font-medium text-onwei-blue underline">
        Go to dashboard
      </Link>
    </div>
  );
}
