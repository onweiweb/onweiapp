import Link from "next/link";

// Extracted from the Homepage (was page-local) — the pill-shaped CTA button
// shape reused across every "view all"/"add to cart"/"explore" link.
export function CtaLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-[30px] px-6 py-3 font-grotesk text-label uppercase ${className}`}
    >
      {children}
    </Link>
  );
}
