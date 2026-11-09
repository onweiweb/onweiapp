"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { NameStep } from "./NameStep";
import { SignInPanel } from "./SignInPanel";

// Shown once per visit (browser tab session) to signed-out visitors: sign
// in, or carry on as a guest (closing counts as carrying on). It comes back
// on the next visit until they sign in. No Figma frame exists; the owner
// approved building it in the checkout frames' style (2026-11-09).
const SEEN_KEY = "onwei_entry_seen_visit";
const SKIP_PREFIXES = [
  "/ontheway",
  "/insider",
  "/privacy",
  "/terms",
  "/checkout",
  "/account",
  "/login",
];

export function EntryPopup() {
  const pathname = usePathname();
  const { session, refresh, refreshSession } = useCart();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"choose" | "signIn" | "name">("choose");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const skip = SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (skip || !session || session.signedIn) return;
    if (/bot|crawl|spider/i.test(navigator.userAgent)) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    // Never on top of something the visitor is already using (the bag, the
    // option picker): wait until it's closed.
    const timer = setInterval(() => {
      if (document.querySelector('[role="dialog"]')) return;
      clearInterval(timer);
      setVisible(true);
    }, 1500);
    return () => clearInterval(timer);
  }, [skip, session]);

  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function dismiss() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // storage blocked: it may show again on the next page
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-onwei-blue/40 p-0 desk:items-center desk:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[30rem] rounded-t-[1.75rem] bg-onwei-green p-6 outline-none desk:rounded-[1.75rem] desk:p-8"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-onwei-blue text-onwei-blue"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {step === "choose" ? (
          <div className="flex flex-col gap-4 pr-10 text-onwei-blue">
            <p className="w-fit rounded-full bg-onwei-blue px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.08em] text-onwei-beige">
              Welcome
            </p>
            <h2
              id={titleId}
              className="font-display text-[length:max(2rem,26px)] font-bold uppercase leading-[0.95]"
            >
              Good to see you on the Wei.
            </h2>
            <p className="font-grotesk text-[length:max(0.875rem,12px)] leading-[1.5]">
              Sign in for faster checkout and your Insider discount.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("signIn")}
                className="flex h-12 items-center justify-center rounded-full bg-onwei-blue font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="flex h-12 items-center justify-center rounded-full border border-onwei-blue font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-blue"
              >
                Continue without signing in
              </button>
            </div>
          </div>
        ) : step === "signIn" ? (
          <div className="pr-6">
            <SignInPanel
              heading="Sign in"
              intro="We'll send a one-time code."
              onDone={async ({ needsName }) => {
                await Promise.all([refreshSession(), refresh()]);
                if (needsName) setStep("name");
                else dismiss();
              }}
            />
          </div>
        ) : (
          <NameStep onDone={dismiss} />
        )}
      </div>
    </div>
  );
}
