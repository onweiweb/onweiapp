import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Button } from "@onwei/ui";

const VARIANT_CLASSES = {
  primary: "bg-onwei-blue font-cta uppercase tracking-wide text-onwei-beige",
  secondary:
    "border border-onwei-blue/40 bg-transparent font-medium text-onwei-blue hover:border-onwei-blue",
  danger: "bg-onwei-black font-cta uppercase tracking-wide text-onwei-white",
} as const;

export const AdminButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof VARIANT_CLASSES;
  }
>(function AdminButton({ variant = "primary", className = "", ...props }, ref) {
  return (
    <Button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-[30px] px-4 py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
