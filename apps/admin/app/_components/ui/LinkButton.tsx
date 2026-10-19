import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANT_CLASSES = {
  primary: "bg-onwei-blue text-onwei-beige",
  secondary: "border border-onwei-blue bg-transparent text-onwei-blue",
  danger: "bg-onwei-black text-onwei-white",
} as const;

/** A link that looks like an AdminButton, for "go to another page" actions. */
export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof VARIANT_CLASSES }) {
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-[30px] px-5 py-2 font-cta text-sm uppercase tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
