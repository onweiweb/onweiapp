"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

// Same mark as apps/web/app/icon.svg (the browser-tab favicon), inlined
// here as its own path, not a next/image of that file, so it can be themed
// with a Tailwind text-* class (fill="currentColor") and animated
// independently. Its asymmetric squiggle shape (unlike the round "O" blob
// in the header wordmark) is what makes a rotation wiggle actually visible.
function OnweiMark(props: React.ComponentProps<typeof motion.svg>) {
  return (
    <motion.svg
      viewBox="0 0 22 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M20.2212 5.12127C19.7403 5.06014 19.232 5.21297 18.8028 5.67451C18.5806 5.91598 18.4223 6.21553 18.1849 6.44477C17.9474 6.67402 17.5761 6.81462 17.29 6.65568C17.0891 6.54258 16.9856 6.31334 16.9338 6.09021C16.8029 5.52474 16.9338 4.93176 17.1408 4.39074C17.3448 3.84972 17.6217 3.33622 17.8013 2.78297C18.1301 1.76513 17.9383 1.07128 17.0525 0.435511C16.3555 -0.0657707 15.4302 -0.212488 14.7575 0.417171C14.1639 0.973471 13.9265 1.80486 13.6221 2.55984C13.0316 4.02089 12.1002 5.34134 10.9222 6.38364C10.3651 6.87575 9.72593 7.31896 8.99235 7.42594C7.15385 7.69492 6.83729 6.09632 7.74741 4.84923C8.02744 4.46716 8.33183 4.06674 8.38967 3.59603C8.50533 2.60569 7.40041 1.82015 6.41115 1.89962C5.42189 1.97909 4.58482 2.63932 3.84516 3.30565C2.26234 4.73308 0.786059 6.38058 0.0677042 8.39182C-0.261035 9.31186 0.658217 11.1305 1.72662 11.1703C2.04622 11.1825 2.34148 11.0113 2.60325 10.8279C2.86198 10.6445 3.10854 10.4459 3.33683 10.2258C3.5773 9.99959 3.80254 9.74895 4.09475 9.59612C4.35348 9.45857 4.6944 9.41578 4.92573 9.59612C5.55886 10.0913 4.64265 11.5401 4.37479 12.0658C3.75993 13.2732 3.7234 14.2666 4.26521 15.5137C4.64874 16.3909 5.59234 17.1184 6.59378 16.9839C7.17516 16.9044 7.68044 16.5438 8.09137 16.125C9.12628 15.0674 9.67723 13.64 10.4138 12.3532C11.1505 11.0663 12.2341 9.81619 13.6921 9.59001C13.8626 9.5625 14.0452 9.55333 14.2065 9.61446C14.5109 9.73061 14.6753 10.0791 14.6753 10.4061C14.6753 10.7332 14.5474 11.0449 14.4196 11.3445C14.1426 11.9986 13.4882 12.9034 13.8504 13.5483C14.1487 14.0801 14.9888 14.34 15.5489 14.2941C16.5381 14.2146 17.3752 13.5544 18.1149 12.8881C19.6977 11.4606 21.174 9.81314 21.8923 7.8019C22.3337 6.56704 21.3475 5.25881 20.2243 5.1121L20.2212 5.12127Z"
        fill="currentColor"
      />
    </motion.svg>
  );
}

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
            className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[30px] bg-onwei-purple px-8 py-10 text-center outline-none sm:px-14 sm:py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            onClick={(event) => event.stopPropagation()}
          >
            <OnweiMark
              className="h-[42px] w-[54px] text-onwei-green"
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
              className="font-display text-[20px] font-bold uppercase leading-[1.1] text-onwei-green sm:text-[28px]"
            >
              Welcome to the movement
            </p>
            <p className="font-grotesk text-[14px] text-onwei-beige">
              You&apos;re officially on the list and warmed up.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
