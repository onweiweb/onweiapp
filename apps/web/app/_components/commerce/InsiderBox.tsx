"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { track } from "../../../lib/analytics/track";
import { useCart } from "./CartProvider";
import { looksLikeInsiderId, SignInPanel } from "./SignInPanel";

const BOX =
  "flex flex-col gap-2 rounded-[0.75rem] border border-onwei-blue px-3 py-2.5 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue";
const INPUT =
  "h-10 min-w-0 flex-1 rounded-full border border-onwei-blue bg-onwei-white px-4 font-grotesk text-[length:max(0.875rem,16px)] uppercase text-onwei-blue placeholder:normal-case placeholder:text-onwei-blue/50";
const BUTTON =
  "h-10 shrink-0 rounded-full bg-onwei-blue px-5 font-grotesk text-[length:max(0.75rem,11px)] uppercase text-onwei-beige disabled:opacity-60";

type Dialog =
  { kind: "join"; signedIn: boolean } | { kind: "signIn"; insiderId: string };

/**
 * "Insider? Log in for your exclusive offers." above the pay button, in the
 * bag and at checkout (owner brief, 2026-11-25; no Figma frame, built in the
 * bag's style). Typing an ID never applies the offer by itself: the customer
 * signs in with a code sent to the number on that membership, and then the
 * Insider offer applies on its own.
 *
 * - Signed-in Insider: the ID, ticked, with the offer.
 * - Signed out: type the ID, get a code on the member's number.
 * - Signed in but not an Insider: "Want to become an Insider?", with a small
 *   way in for an Insider signed in with another email or number.
 */
export function InsiderBox() {
  const { cart, session, setInsider, busy } = useCart();
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const inputId = useId();
  if (!cart) return null;
  const signedIn = Boolean(session?.signedIn);

  if (cart.insider) {
    const insider = cart.insider;
    const gift = cart.preorder?.gifts.find((g) => g.reason === "Insider gift");
    return (
      <div className={`${BOX} border-transparent bg-onwei-green`}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold tracking-[0.04em]">
            {insider.code} <span aria-hidden>✓</span>
            <span className="sr-only">Insider ID</span>
          </span>
          <span className="text-[length:max(0.75rem,11px)] uppercase">
            {insider.applied
              ? "Applied"
              : insider.switchedOn
                ? "Not used"
                : "Off"}
          </span>
        </div>
        <p>
          {insider.applied
            ? `Your Insider ${insider.percent}% off is on this order${gift ? `, plus a free ${gift.itemLabel}` : ""}.`
            : insider.switchedOn && insider.blockedBy
              ? `Your Insider ${insider.percent}% can't be used with ${insider.blockedBy}. We kept the bigger saving.`
              : `Insider ${insider.percent}% off is switched off for this order.`}
        </p>
        {!insider.switchedOn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setInsider(true)}
            className="w-fit underline underline-offset-2"
          >
            Use my Insider offer
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {signedIn ? (
        <button
          type="button"
          onClick={() => {
            track("insider_box_opened", { signed_in: true });
            setDialog({ kind: "join", signedIn: true });
          }}
          className={`${BOX} text-left`}
        >
          <span className="font-bold">Insider?</span>
          <span>Log in for your exclusive offers.</span>
        </button>
      ) : (
        <form
          className={BOX}
          onSubmit={(event) => {
            event.preventDefault();
            const value = id.replace(/\s+/g, "").toUpperCase();
            if (!looksLikeInsiderId(value)) {
              setError("An Insider ID looks like WEI1234.");
              return;
            }
            setError(null);
            track("insider_box_opened", { signed_in: false });
            setDialog({ kind: "signIn", insiderId: value });
          }}
        >
          <label htmlFor={inputId}>
            <span className="font-bold">Insider?</span> Log in for your
            exclusive offers.
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={id}
              onChange={(event) => {
                setId(event.target.value.toUpperCase());
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Your Insider ID, e.g. WEI1234"
              className={INPUT}
            />
            <button type="submit" disabled={!id.trim()} className={BUTTON}>
              Log in
            </button>
          </div>
          {error ? (
            <p role="alert" className="text-[#b91c1c]">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setDialog({ kind: "join", signedIn: false })}
            className="w-fit text-[length:max(0.75rem,11px)] underline underline-offset-2"
          >
            Not an Insider yet?
          </button>
        </form>
      )}
      {dialog ? (
        <InsiderDialog
          dialog={dialog}
          onChange={setDialog}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}

function InsiderDialog({
  dialog,
  onChange,
  onClose,
}: {
  dialog: Dialog;
  onChange: (next: Dialog) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { refresh, refreshSession, setOpen } = useCart();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-onwei-blue/40 desk:items-center desk:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-[28rem] flex-col gap-4 overflow-y-auto rounded-t-[1.75rem] bg-onwei-beige p-6 text-onwei-blue outline-none desk:rounded-[1.75rem] desk:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-onwei-blue"
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
        {dialog.kind === "join" ? (
          <>
            <h2
              id={titleId}
              className="pr-12 font-display text-[length:max(1.75rem,22px)] font-bold uppercase leading-none"
            >
              Want to become an Insider?
            </h2>
            <p className="font-grotesk text-[length:max(0.875rem,12px)] leading-[1.5]">
              Insiders get a personal discount, first access to drops and
              events.
            </p>
            <Link
              href="/insiders"
              onClick={() => {
                onClose();
                setOpen(false);
              }}
              className="flex h-12 items-center justify-center rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige"
            >
              Join Insiders
            </Link>
            {dialog.signedIn ? (
              <button
                type="button"
                onClick={() => onChange({ kind: "signIn", insiderId: "" })}
                className="self-center font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
              >
                Already an Insider? Use your Insider ID
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onChange({ kind: "signIn", insiderId: "" })}
                className="flex h-12 items-center justify-center rounded-full border border-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em]"
              >
                Log in with OTP
              </button>
            )}
          </>
        ) : (
          <div id={titleId}>
            <SignInPanel
              heading="Insider log in"
              intro="We'll send a code to the number on your membership. Your bag stays as it is."
              initialContact={dialog.insiderId}
              onUnknownInsider={() =>
                onChange({ kind: "join", signedIn: false })
              }
              onDone={async () => {
                await Promise.all([refresh(), refreshSession()]);
                router.refresh();
                onClose();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
