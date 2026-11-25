"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ConsentCheckbox } from "../ConsentCheckbox";
import { FieldError } from "../FieldError";
import { SIGN_IN_ERRORS } from "../../../lib/messages/commerce";

type Channel = "EMAIL" | "SMS" | "WHATSAPP";

const INPUT =
  "h-12 w-full rounded-full border border-onwei-blue bg-onwei-white px-5 font-grotesk text-[length:max(0.9375rem,16px)] text-onwei-blue placeholder:text-onwei-blue/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-onwei-blue";
const PRIMARY =
  "flex h-12 w-full items-center justify-center rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60";
const SECONDARY =
  "flex h-12 w-full items-center justify-center rounded-full border border-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-blue disabled:opacity-60";

function looksLikePhone(value: string): boolean {
  return /^[+\d\s()-]{8,}$/.test(value.trim()) && !value.includes("@");
}

/** "WEI1234" (spaces and case ignored): an Insider ID. */
export function looksLikeInsiderId(value: string): boolean {
  return /^WEI\d{4}$/.test(value.replace(/\s+/g, "").toUpperCase());
}

async function post(url: string, body: unknown) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as {
      ok: boolean;
      reason?: string;
      identifier?: string;
      /** Signing in by Insider ID: the last digits of the member's number. */
      sentTo?: string | null;
      resendAfterSeconds?: number;
      needsName?: boolean;
    };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

/**
 * Sign in with an email, a mobile number or an Insider ID, and a 6-digit
 * code. Phones and Insider IDs pick WhatsApp or SMS; with an Insider ID the
 * code goes to the member's number. Used by the entry pop-up, checkout, the
 * bag's Insider box and /login. The same component links a missing contact
 * on the account page (`mode="link"`, no Insider IDs there).
 */
export function SignInPanel({
  onDone,
  mode = "signIn",
  heading,
  intro,
  initialContact = "",
  onUnknownInsider,
}: {
  onDone: (result: { needsName: boolean }) => void;
  mode?: "signIn" | "link";
  heading?: string;
  intro?: string;
  /** Start with this typed in (for example an Insider ID from the bag). */
  initialContact?: string;
  /** The Insider ID typed in isn't one of ours. */
  onUnknownInsider?: () => void;
}) {
  const [step, setStep] = useState<"contact" | "code">("contact");
  const [contact, setContact] = useState(initialContact);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [wait, setWait] = useState(0);
  const contactId = useId();
  const codeId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const insiderId = mode === "signIn" && looksLikeInsiderId(contact);
  const phone = insiderId || looksLikePhone(contact);
  const requestUrl =
    mode === "link" ? "/api/account/contact/request" : "/api/auth/request-otp";
  const verifyUrl =
    mode === "link" ? "/api/account/contact/verify" : "/api/auth/verify-otp";

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(via: Channel) {
    setError(null);
    if (!contact.trim()) {
      setError(
        phone
          ? SIGN_IN_ERRORS.INVALID_PHONE!
          : mode === "signIn"
            ? "Enter your email, mobile number or Insider ID."
            : "Enter your email or mobile number.",
      );
      return;
    }
    setWorking(true);
    const data = await post(requestUrl, {
      identifier: contact.trim(),
      channel: via,
    });
    setWorking(false);
    if (!data.ok) {
      if (data.reason === "UNKNOWN_INSIDER" && onUnknownInsider) {
        onUnknownInsider();
        return;
      }
      setError(
        SIGN_IN_ERRORS[data.reason ?? "NETWORK"] ?? SIGN_IN_ERRORS.NETWORK!,
      );
      return;
    }
    setChannel(via);
    setSentTo(data.sentTo ?? null);
    setIdentifier(data.identifier ?? contact.trim());
    setWait(data.resendAfterSeconds ?? 30);
    setCode("");
    setStep("code");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (mode === "signIn" && !consent) {
      setError(SIGN_IN_ERRORS.CONSENT_REQUIRED!);
      return;
    }
    setWorking(true);
    const data = await post(verifyUrl, {
      identifier,
      channel,
      code: digits,
      consent: true,
    });
    setWorking(false);
    if (!data.ok) {
      setError(
        SIGN_IN_ERRORS[data.reason ?? "NETWORK"] ?? SIGN_IN_ERRORS.NETWORK!,
      );
      return;
    }
    onDone({ needsName: Boolean(data.needsName) });
  }

  const where =
    channel === "EMAIL"
      ? identifier
      : `${channel === "WHATSAPP" ? "WhatsApp" : "SMS"} on ${sentTo ? `the number on your Insider ID (${sentTo})` : identifier}`;

  return (
    <div className="flex flex-col gap-4 text-onwei-blue">
      {heading ? (
        <h2 className="font-display text-[length:max(1.75rem,22px)] font-bold uppercase leading-none">
          {heading}
        </h2>
      ) : null}
      {step === "contact" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode(phone ? "WHATSAPP" : "EMAIL");
          }}
        >
          {intro ? (
            <p className="font-grotesk text-[length:max(0.875rem,12px)] leading-[1.5]">
              {intro}
            </p>
          ) : null}
          <label
            htmlFor={contactId}
            className="font-grotesk text-[length:max(0.75rem,11px)] uppercase tracking-[0.04em]"
          >
            {mode === "signIn"
              ? "Email, mobile number or Insider ID"
              : "Email or mobile number"}
          </label>
          <input
            id={contactId}
            value={contact}
            onChange={(event) => {
              setContact(event.target.value);
              setError(null);
            }}
            autoComplete="username"
            inputMode={phone && !insiderId ? "tel" : "email"}
            placeholder={
              mode === "signIn"
                ? "you@example.com, 98765 43210 or WEI1234"
                : "you@example.com or 98765 43210"
            }
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${contactId}-error` : undefined}
            className={INPUT}
          />
          <FieldError id={`${contactId}-error`} message={error ?? undefined} />
          {phone ? (
            <div className="grid grid-cols-1 gap-2 desk:grid-cols-2">
              <button type="submit" disabled={working} className={PRIMARY}>
                {working ? "Sending..." : "Code on WhatsApp"}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => sendCode("SMS")}
                className={SECONDARY}
              >
                Code by SMS
              </button>
            </div>
          ) : (
            <button type="submit" disabled={working} className={PRIMARY}>
              {working ? "Sending..." : "Send me a code"}
            </button>
          )}
        </form>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={verify}>
          <p className="font-grotesk text-[length:max(0.875rem,12px)] leading-[1.5]">
            We sent a 6-digit code to {where}.{" "}
            <button
              type="button"
              onClick={() => {
                setStep("contact");
                setError(null);
              }}
              className="underline underline-offset-2"
            >
              Change
            </button>
          </p>
          <label
            htmlFor={codeId}
            className="font-grotesk text-[length:max(0.75rem,11px)] uppercase tracking-[0.04em]"
          >
            Code
          </label>
          <input
            ref={codeRef}
            id={codeId}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/[^\d]/g, "").slice(0, 6));
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${codeId}-error` : undefined}
            className={`${INPUT} text-center tracking-[0.5em]`}
          />
          <FieldError id={`${codeId}-error`} message={error ?? undefined} />
          {mode === "signIn" ? (
            <ConsentCheckbox
              checked={consent}
              onChange={setConsent}
              lead="I agree to the"
              links={["terms", "privacy"]}
            />
          ) : null}
          <button type="submit" disabled={working} className={PRIMARY}>
            {working ? "Checking..." : mode === "link" ? "Confirm" : "Sign in"}
          </button>
          <p className="text-center font-grotesk text-[length:max(0.75rem,11px)]">
            {wait > 0 ? (
              `You can ask for a new code in ${wait}s`
            ) : (
              <button
                type="button"
                disabled={working}
                onClick={() => sendCode(channel)}
                className="underline underline-offset-2"
              >
                Send a new code
              </button>
            )}
          </p>
        </form>
      )}
    </div>
  );
}
