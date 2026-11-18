import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * apps/web's rounded-[500px] pill works for short single-line marketing
 * inputs; it breaks down on dense multi-field admin forms. AdminInput keeps
 * the full pill (single-line only); AdminSelect/AdminTextarea use a smaller
 * rounded-[20px], same shape language, scaled for density.
 *
 * Border is onwei-blue/25, not onwei-beige: most admin forms sit directly on
 * the page's onwei-beige background (not inside an AdminCard), so a
 * beige-on-beige border was invisible there.
 */
export const AdminInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function AdminInput({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`h-9 rounded-[500px] border border-onwei-blue/25 bg-transparent px-3.5 text-sm text-onwei-blue outline-none focus:border-onwei-purple ${className}`}
      {...props}
    />
  );
});

export const AdminSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function AdminSelect({ className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`h-9 rounded-[14px] border border-onwei-blue/25 bg-transparent px-3.5 text-sm text-onwei-blue outline-none focus:border-onwei-purple ${className}`}
      {...props}
    />
  );
});

export const AdminTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AdminTextarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`rounded-[14px] border border-onwei-blue/25 bg-transparent px-3.5 py-2.5 text-sm text-onwei-blue outline-none focus:border-onwei-purple ${className}`}
      {...props}
    />
  );
});
