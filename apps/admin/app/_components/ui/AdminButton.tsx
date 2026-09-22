import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Button } from "@onwei/ui";

const VARIANT_CLASSES = {
  primary: "bg-onwei-blue text-onwei-beige",
  secondary: "border border-onwei-blue bg-transparent text-onwei-blue",
  danger: "bg-onwei-black text-onwei-white",
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
      className={`inline-flex items-center justify-center rounded-[30px] px-5 py-2 font-cta text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
