import Link from "next/link";

// Deliberately minimal, matches error.tsx. Not a Figma-matched design;
// a branded 404 needs explicit design sign-off.
export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-[1.75rem] font-bold uppercase text-onwei-blue">
        Page not found
      </p>
      <p className="max-w-md font-grotesk text-body text-onwei-blue/70">
        That page does not exist or has moved.
      </p>
      <Link
        href="/"
        className="rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase text-onwei-beige"
      >
        Go home
      </Link>
    </div>
  );
}
