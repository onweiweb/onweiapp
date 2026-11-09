import type { ComponentProps } from "react";
import { TrackedLink } from "@/_components/TrackedLink";

// The pill shape on its own, for a <button> that must look like a CtaLink.
export const CTA_PILL =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[1.875rem] px-3 py-2 font-grotesk leading-none text-[length:max(0.75rem,11px)] uppercase desk:px-6 desk:py-3 desk:text-label";

// Extracted from the Homepage (was page-local), the pill-shaped CTA button
// shape reused across every "view all"/"add to cart"/"explore" link.
export function CtaLink({
  href,
  children,
  className = "",
  analytics,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  analytics?: ComponentProps<typeof TrackedLink>["analytics"];
}) {
  return (
    <TrackedLink
      href={href}
      analytics={analytics}
      className={`${CTA_PILL} ${className}`}
    >
      {children}
    </TrackedLink>
  );
}
