"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OnweiMark } from "./OnweiMark";

export function WaitlistSuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            className="my-auto flex w-full max-w-[26.25rem] flex-col items-center gap-4 rounded-[1.875rem] bg-onwei-purple px-8 py-10 text-center outline-none desk:px-14 desk:py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            onClick={(event) => event.stopPropagation()}
          >
            <OnweiMark
              className="h-[2.625rem] w-[3.375rem] text-onwei-green"
              animate={{ rotate: [0, -12, 10, -8, 6, 0] }}
              transition={{
                duration: 1.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1.5,
              }}
            />
            <p
              id={headingId}
              className="font-display text-[1.25rem] font-bold uppercase leading-[1.1] text-onwei-green desk:text-[1.75rem]"
            >
              Welcome to the movement
            </p>
            <p className="font-grotesk text-[length:max(0.875rem,11px)] text-onwei-beige">
              You&apos;re officially on the list and warmed up.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
