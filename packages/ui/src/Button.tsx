import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

/**
 * Headless button: no visual opinion, no default styling. apps/web themes it
 * to match Figma; apps/admin themes it plainly. See docs/ARCHITECTURE.md
 * ("packages/ui ... each app layers its own look on top").
 */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ type = "button", ...props }, ref) {
  return <button ref={ref} type={type} {...props} />;
});
