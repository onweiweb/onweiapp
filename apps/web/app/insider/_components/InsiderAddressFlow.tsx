"use client";

import { useState } from "react";
import { InsiderAddressForm, type AddressValues } from "./InsiderAddressForm";

// Three states on one page: the form, the "got it" confirmation, and the
// saved address with a "Change it" button when the member comes back.
export function InsiderAddressFlow({
  token,
  states,
  initial,
  alreadySaved,
  posted,
}: {
  token: string;
  states: readonly string[];
  initial: AddressValues;
  alreadySaved: boolean;
  posted: boolean;
}) {
  const [mode, setMode] = useState<"form" | "saved" | "justSaved">(
    alreadySaved ? "saved" : "form",
  );
  const [values, setValues] = useState(initial);

  if (mode === "form") {
    return (
      <div className="rounded-[1.5rem] border border-onwei-blue bg-onwei-white/60 p-5 desk:p-8">
        <InsiderAddressForm
          token={token}
          states={states}
          initial={values}
          onSaved={(saved) => {
            setValues(saved);
            setMode("justSaved");
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-[1.5rem] border border-onwei-blue bg-onwei-white p-5 desk:p-8">
      {mode === "justSaved" ? (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onwei-blue text-onwei-green"
          >
            <svg viewBox="0 0 16 16" className="size-4 fill-current">
              <path d="M6.2 11.6 2.6 8l1.1-1.1 2.5 2.5 6.1-6.1 1.1 1.1z" />
            </svg>
          </span>
          <p
            role="status"
            className="font-display text-[length:max(1.25rem,16px)] font-bold"
          >
            Got it. Your card is on its way soon.
          </p>
        </div>
      ) : (
        <p className="font-display text-[length:max(1.25rem,16px)] font-bold">
          {posted ? "Your card has been posted." : "We have your address."}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <p className="font-grotesk text-[length:max(0.75rem,11px)] uppercase tracking-[0.04em]">
          Posting to
        </p>
        <address className="font-grotesk text-[length:max(0.875rem,12px)] not-italic leading-[1.5]">
          {values.fullName}
          <br />
          {values.line1}
          {values.line2 ? (
            <>
              <br />
              {values.line2}
            </>
          ) : null}
          <br />
          {values.city}, {values.state} {values.postalCode}
        </address>
      </div>

      {!posted ? (
        <button
          type="button"
          onClick={() => setMode("form")}
          className="flex h-11 w-fit items-center rounded-[31.25rem] border border-onwei-blue px-6 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.06em]"
        >
          Change it
        </button>
      ) : null}
    </div>
  );
}
