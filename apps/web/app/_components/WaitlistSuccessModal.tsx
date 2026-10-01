"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { InstagramIcon } from "./WaitlistFooter";

const ENVELOPE = "/images/waitlist/envelope";

// Figma Group 8 (1098:6823), a 648x655 stage. Every child below is placed in
// percent of that stage (and text in cqw), so the whole envelope scales with
// the box instead of being tied to px. Layers, back to front: top flap and
// sides, the card (clipped to the slot above the front pocket), front pocket.
// The flap closes by flipping 180deg about its bottom edge, then swings open,
// and the card slides up out of the slot.
export function WaitlistSuccessModal({
  open,
  onClose,
  instagramUrl,
}: {
  open: boolean;
  onClose: () => void;
  instagramUrl: string | null;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // With reduced motion every element starts in its final state.
  const still = Boolean(reduceMotion);
  const fadeUp = (delay: number) => ({
    initial: still ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: "easeOut" as const },
  });

  const friends = (
    <>
      <InstagramIcon />
      <span className="font-display text-[1.25rem] font-bold uppercase leading-[0.9] desk:text-[1.5rem]">
        Let&apos;s be friends
      </span>
    </>
  );

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
            className="my-auto flex w-full max-w-[28rem] flex-col items-center gap-6 rounded-[1.875rem] bg-onwei-purple px-5 py-8 text-center outline-none desk:max-w-[32rem] desk:px-10 desk:py-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative aspect-[648/655] w-full max-w-[22rem] [container-type:inline-size] [perspective:75rem]"
              aria-hidden
            >
              <Image
                src={`${ENVELOPE}/sides.svg`}
                alt=""
                fill
                unoptimized
                className="object-fill"
              />
              <motion.div
                className="absolute left-0 top-0 h-[38.6%] w-full origin-bottom"
                initial={still ? false : { rotateX: 180, zIndex: 6 }}
                animate={{ rotateX: 0, zIndex: [6, 6, 1, 1] }}
                transition={{
                  duration: 0.7,
                  delay: 0.45,
                  ease: "easeInOut",
                  zIndex: {
                    duration: 0.7,
                    delay: 0.45,
                    times: [0, 0.49, 0.5, 1],
                  },
                }}
              >
                <Image
                  src={`${ENVELOPE}/flap.svg`}
                  alt=""
                  fill
                  unoptimized
                  className="object-fill"
                />
              </motion.div>
              <div className="absolute left-0 top-0 z-[2] h-[67.18%] w-full overflow-hidden">
                <motion.div
                  className="absolute left-[3.24%] top-[18.64%] h-[81.36%] w-[93.4%] rounded-[3.86cqw] bg-onwei-green"
                  initial={still ? false : { y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 0.9,
                    delay: 1.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="absolute left-[44.46%] top-[12.29%] h-[14.25%] w-[10.91%]">
                    <Image
                      src={`${ENVELOPE}/mark.svg`}
                      alt=""
                      fill
                      unoptimized
                    />
                  </div>
                  <p className="absolute left-1/2 top-[37.43%] -translate-x-1/2 whitespace-nowrap font-display text-[4.63cqw] font-bold uppercase leading-[0.9] text-onwei-blue">
                    onwei insider
                  </p>
                  <p className="absolute left-1/2 top-[53.35%] -translate-x-1/2 whitespace-nowrap font-display text-[7.41cqw] font-bold uppercase leading-[0.9] text-onwei-blue">
                    Let&apos;s get Moving!
                  </p>
                  <div className="absolute left-[75.04%] top-[41.34%] h-[34.64%] w-[20.66%]">
                    <Image
                      src={`${ENVELOPE}/lunge.svg`}
                      alt=""
                      fill
                      unoptimized
                    />
                  </div>
                </motion.div>
              </div>
              <div className="absolute left-[0.62%] top-[63.05%] z-[3] h-[36.95%] w-[98.96%]">
                <Image
                  src={`${ENVELOPE}/front.svg`}
                  alt=""
                  fill
                  unoptimized
                  className="object-fill"
                />
              </div>
            </div>

            <motion.div
              className="flex flex-col gap-3 text-onwei-blue"
              {...fadeUp(2)}
            >
              <p
                id={headingId}
                className="font-display text-[1.25rem] font-bold uppercase leading-[1.1] desk:text-[1.75rem]"
              >
                You&apos;re officially part of the Movement.
              </p>
              <p className="font-grotesk text-[length:max(0.875rem,11px)] leading-[1.4]">
                One of the firsts: first to know, first dibs, first through the
                door when things open up.
              </p>
              <p className="font-grotesk text-[length:max(0.875rem,11px)] font-bold leading-[1.4]">
                Watch your inbox. We&apos;re on the Way.
              </p>
            </motion.div>

            <motion.div {...fadeUp(2.2)}>
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Let's be friends, Onwei on Instagram"
                  className="flex items-center gap-3 text-onwei-beige"
                >
                  {friends}
                </a>
              ) : (
                <div className="flex items-center gap-3 text-onwei-beige">
                  {friends}
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
