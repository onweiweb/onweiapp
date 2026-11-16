"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * A popup for a form or detail that doesn't need its own page. Uses the
 * native <dialog> (focus trap, Escape to close). Render it only while open,
 * or keep it mounted and flip `open`.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width =
    size === "sm"
      ? "w-[min(26rem,92vw)]"
      : size === "lg"
        ? "w-[min(52rem,92vw)]"
        : "w-[min(38rem,92vw)]";

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dimmed backdrop closes it.
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[90vh] ${width} overflow-y-auto rounded-[24px] bg-onwei-white p-0 text-onwei-blue shadow-xl backdrop:bg-onwei-blue/40`}
    >
      {open ? (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-semibold uppercase">
                {title}
              </p>
              {description ? (
                <div className="text-sm text-onwei-blue/80">{description}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-onwei-blue/70 hover:bg-onwei-beige/40 hover:text-onwei-blue"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
