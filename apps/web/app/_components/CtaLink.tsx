import Link from "next/link";

// Extracted from the Homepage (was page-local), the pill-shaped CTA button
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
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-[1.875rem] px-3 py-2 font-grotesk text-[length:max(0.75rem,11px)] uppercase desk:px-6 desk:py-3 desk:text-label ${className}`}
    >
      {children}
    </Link>
  );
}
