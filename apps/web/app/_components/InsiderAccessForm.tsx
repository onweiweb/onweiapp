"use client";

import { useId, useState } from "react";
import { getFirstTouch } from "../../lib/analytics/attribution";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { FieldError } from "./FieldError";
import { PILL_INPUT, MESSAGE_INPUT } from "./formStyles";

// Invite-only Insiders (owner brief 2026-11-25). No Figma frame: built in the
// "join onwei insiders" form's style (approved 2026-11-26). Path A: an
// Insider's number lets you in straight away. Path B: apply, staff approve.
// Both check the mobile number with a code before sending.

const JOIN_REASONS = [
  "First access to drops",
  "Exclusive offers and discounts",
  "Events access",
  "Giving insights on product",
  "Meeting other people who move",
  "All of the above!",
] as const;
const ALL = "All of the above!";
const SESSIONS = ["6am", "Lunchtime", "After work", "Whenever it happens"];

const ERRORS: Record<string, string> = {
  INVALID_NAME: "Enter your full name.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_PHONE: "Enter a valid mobile number.",
  INVALID_ACTIVITY: "Tell us the fitness activity you do.",
  INVALID_REASONS: "Pick at least one reason to join.",
  INVALID_SESSION: "Pick a session, or leave it.",
  INVALID_GEAR_WISH: "Keep the gear idea under 300 characters.",
  ALREADY_MEMBER:
    "This mobile number is already an Insider. Sign in with it to see your Insider ID.",
  ALREADY_APPLIED:
    "This mobile number has already applied. We'll get back to you.",
  DUPLICATE_EMAIL:
    "This email is already with us under a different mobile number.",
  UNKNOWN_INVITER: "That Insider number doesn't match. You can still apply.",
  CONSENT_REQUIRED: "Tick the box to agree before sending.",
  RATE_LIMITED: "Too many tries. Wait a few minutes and try again.",
  INCORRECT_CODE: "That code isn't right. Check it and try again.",
  EXPIRED: "That code has expired. Send a new one.",
  NOT_FOUND: "Send yourself a code first.",
  MAX_ATTEMPTS_EXCEEDED: "Too many wrong codes. Send a new one.",
  PHONE_UNAVAILABLE:
    "We can't send codes to mobiles right now. Try again in a little while.",
  SMS_SEND_FAILED: "The text didn't go through. Try WhatsApp instead.",
  WHATSAPP_SEND_FAILED: "The WhatsApp didn't go through. Try a text instead.",
  OPEN_SIGNUP: "Joining is open again. Refresh the page to join.",
  NETWORK: "Something went wrong. Check your connection and try again.",
};

const LABEL =
  "font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-blue";
const PRIMARY =
  "flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-[1.25rem] uppercase text-onwei-green disabled:opacity-70 desk:text-[1.5rem]";
const CODE_BUTTON =
  "flex h-12 w-full items-center justify-center rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60";
const SECONDARY =
  "flex h-12 w-full items-center justify-center rounded-full border border-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-blue disabled:opacity-60";

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
      valid?: boolean;
      firstName?: string;
      approved?: boolean;
    };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

type Stage =
  | { kind: "start"; note?: string }
  | { kind: "invite"; inviterCode: string; firstName: string }
  | { kind: "apply" }
  | { kind: "done"; approved: boolean };

export function InsiderAccessForm() {
  const [stage, setStage] = useState<Stage>({ kind: "start" });
  const [inviteCode, setInviteCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const inviteId = useId();

  async function checkInvite(event: React.FormEvent) {
    event.preventDefault();
    const code = inviteCode.replace(/\s+/g, "").toUpperCase();
    if (!code) return;
    setChecking(true);
    setInviteError(null);
    const data = await post("/api/insider/invite", { code });
    setChecking(false);
    if (!data.ok) {
      setInviteError(ERRORS[data.reason ?? "NETWORK"] ?? ERRORS.NETWORK!);
      return;
    }
    if (data.valid) {
      setStage({
        kind: "invite",
        inviterCode: code,
        firstName: data.firstName ?? "",
      });
      return;
    }
    setStage({ kind: "apply" });
    setInviteError(
      "That number doesn't match. You can still apply to join below.",
    );
  }

  if (stage.kind === "done")
    return (
      <div className="flex flex-col gap-3 rounded-[1.25rem] bg-onwei-green p-6 text-onwei-blue">
        <p className="font-display text-[length:max(1.75rem,22px)] font-bold uppercase leading-none">
          {stage.approved ? "You're in!" : "Great, you're interested."}
        </p>
        <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
          {stage.approved
            ? "Welcome to Onwei Insiders. Your own Insider ID is on its way by email and WhatsApp."
            : "We'll get back to you about your Insider status. We've sent this to your email too."}
        </p>
      </div>
    );

  return (
    <div className="flex w-full flex-col gap-6 text-onwei-blue">
      {stage.kind !== "invite" ? (
        <form onSubmit={checkInvite} className="flex flex-col gap-3">
          <label htmlFor={inviteId} className={LABEL}>
            Know an Insider who can let you in? Enter their Insider number.
          </label>
          <div className="flex gap-2">
            <input
              id={inviteId}
              value={inviteCode}
              onChange={(event) => {
                setInviteCode(event.target.value.toUpperCase());
                setInviteError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="WEI1234"
              className={PILL_INPUT}
            />
            <button
              type="submit"
              disabled={checking || !inviteCode.trim()}
              className="h-12 shrink-0 rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase text-onwei-beige disabled:opacity-60"
            >
              {checking ? "Checking..." : "Let me in"}
            </button>
          </div>
          <FieldError
            id={`${inviteId}-error`}
            message={inviteError ?? undefined}
          />
          {stage.kind === "start" ? (
            <button
              type="button"
              onClick={() => setStage({ kind: "apply" })}
              className="w-fit font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-4"
            >
              No Insider number? Apply to join
            </button>
          ) : null}
        </form>
      ) : (
        <p className="rounded-[1.25rem] bg-onwei-green px-5 py-4 font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
          {stage.firstName
            ? `${stage.firstName} is letting you in.`
            : "That Insider number lets you in."}{" "}
          Fill this in and you&apos;re an Insider straight away.
        </p>
      )}
      {stage.kind === "invite" || stage.kind === "apply" ? (
        <JoinForm
          key={stage.kind}
          path={stage.kind === "invite" ? "INVITE" : "APPLY"}
          inviterCode={stage.kind === "invite" ? stage.inviterCode : undefined}
          onDone={(approved) => setStage({ kind: "done", approved })}
        />
      ) : null}
    </div>
  );
}

function JoinForm({
  path,
  inviterCode,
  onDone,
}: {
  path: "INVITE" | "APPLY";
  inviterCode?: string;
  onDone: (approved: boolean) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [activity, setActivity] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [session, setSession] = useState<number | null>(null);
  const [gearWish, setGearWish] = useState("");
  const [consent, setConsent] = useState(false);
  const [codeSent, setCodeSent] = useState<null | "WHATSAPP" | "SMS">(null);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    activity: useId(),
    session: useId(),
    gear: useId(),
    code: useId(),
    honeypot: useId(),
  };
  const apply = path === "APPLY";

  function toggleReason(reason: string) {
    setReasons((list) => {
      if (reason === ALL) return list.includes(ALL) ? [] : [...JOIN_REASONS];
      const next = list.includes(reason)
        ? list.filter((r) => r !== reason && r !== ALL)
        : [...list, reason];
      const everything = JOIN_REASONS.filter((r) => r !== ALL).every((r) =>
        next.includes(r),
      );
      return everything ? [...JOIN_REASONS] : next;
    });
  }

  function missing(): string | null {
    if (fullName.trim().length < 2) return ERRORS.INVALID_NAME!;
    if (phone.replace(/\D/g, "").length < 10) return ERRORS.INVALID_PHONE!;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return ERRORS.INVALID_EMAIL!;
    if (activity.trim().length < 2) return ERRORS.INVALID_ACTIVITY!;
    if (apply && reasons.length === 0) return ERRORS.INVALID_REASONS!;
    if (!consent) return ERRORS.CONSENT_REQUIRED!;
    return null;
  }

  async function sendCode(channel: "WHATSAPP" | "SMS") {
    const problem = missing();
    if (problem) {
      setError(problem);
      return;
    }
    setWorking(true);
    setError(null);
    const data = await post("/api/auth/request-otp", {
      identifier: phone.trim(),
      channel,
      purpose: "SIGNUP",
    });
    setWorking(false);
    if (!data.ok) {
      setError(ERRORS[data.reason ?? "NETWORK"] ?? ERRORS.NETWORK!);
      return;
    }
    setCode("");
    setCodeSent(channel);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!codeSent) {
      void sendCode("WHATSAPP");
      return;
    }
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    const company = (
      event.currentTarget.elements.namedItem("company") as HTMLInputElement
    )?.value;
    setWorking(true);
    setError(null);
    const data = await post("/api/insider/join", {
      path,
      inviterCode,
      fullName,
      email,
      phone,
      code: code.replace(/\D/g, ""),
      activity,
      joinReasons: reasons,
      sessionPick: session === null ? null : SESSIONS[session],
      gearWish: gearWish.trim() || null,
      consent,
      company,
      attribution: getFirstTouch(),
    });
    setWorking(false);
    if (!data.ok) {
      setError(ERRORS[data.reason ?? "NETWORK"] ?? ERRORS.NETWORK!);
      return;
    }
    onDone(Boolean(data.approved));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor={ids.honeypot} className="sr-only" aria-hidden>
        Company
      </label>
      <input
        id={ids.honeypot}
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-624.9375rem] h-0 w-0 opacity-0"
      />
      <label htmlFor={ids.name} className="sr-only">
        Full name
      </label>
      <input
        id={ids.name}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        autoComplete="name"
        placeholder="Full name"
        className={PILL_INPUT}
      />
      <label htmlFor={ids.phone} className="sr-only">
        Mobile number
      </label>
      <input
        id={ids.phone}
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setCodeSent(null);
        }}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="Mobile number"
        className={PILL_INPUT}
      />
      <label htmlFor={ids.email} className="sr-only">
        Email
      </label>
      <input
        id={ids.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        autoComplete="email"
        placeholder="Email"
        className={`${PILL_INPUT} normal-case`}
      />
      <label htmlFor={ids.activity} className="sr-only">
        What fitness activity do you do?
      </label>
      <input
        id={ids.activity}
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
        placeholder="What fitness activity do you do?"
        className={PILL_INPUT}
      />

      {apply ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className={`${LABEL} mb-2`}>
              Why do you want to join Insiders?
            </legend>
            <div className="flex flex-wrap gap-2">
              {JOIN_REASONS.map((reason) => {
                const on = reasons.includes(reason);
                return (
                  <button
                    key={reason}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleReason(reason)}
                    className={`rounded-full border border-onwei-blue px-4 py-2 font-grotesk text-[length:max(0.8125rem,11px)] ${on ? "bg-onwei-blue text-onwei-beige" : "text-onwei-blue"}`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 rounded-[1.25rem] bg-onwei-purple p-4 desk:p-[1.6875rem]">
            <label
              htmlFor={ids.session}
              className="font-cta text-[length:max(0.875rem,11px)] font-medium leading-[1.3] text-onwei-beige"
            >
              What&apos;s your move? Pick your session (optional)
            </label>
            <div className="relative flex h-6 w-full items-center">
              <div className="pointer-events-none absolute inset-x-0 h-[0.375rem] rounded-full bg-onwei-beige/30" />
              <input
                id={ids.session}
                type="range"
                min={0}
                max={SESSIONS.length - 1}
                step={1}
                value={session ?? 0}
                onChange={(e) => setSession(Number(e.target.value))}
                aria-valuetext={
                  session === null ? "Not picked" : SESSIONS[session]
                }
                className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-onwei-beige [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-[0.375rem] [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[0.3125rem] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-onwei-beige"
              />
            </div>
            <div className="flex items-start justify-between gap-2 font-display text-[length:max(0.75rem,11px)] font-medium uppercase text-onwei-beige">
              {SESSIONS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSession(index)}
                  className={`flex-1 text-center first:text-left last:text-right ${session === index ? "underline underline-offset-4" : "opacity-80"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor={ids.gear} className="sr-only">
            What is something in gear you wish existed?
          </label>
          <textarea
            id={ids.gear}
            value={gearWish}
            onChange={(e) => setGearWish(e.target.value)}
            maxLength={300}
            placeholder="What is something in gear you wish existed? (optional)"
            className={`${MESSAGE_INPUT} h-28`}
          />
        </>
      ) : null}

      <ConsentCheckbox
        checked={consent}
        onChange={setConsent}
        lead="I agree to Onwei contacting me by email and WhatsApp, and accept the"
        links={["privacy"]}
      />

      {codeSent ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.code} className={LABEL}>
            We sent a 6-digit code by{" "}
            {codeSent === "WHATSAPP" ? "WhatsApp" : "SMS"} to your mobile
          </label>
          <input
            id={ids.code}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className={`${PILL_INPUT} text-center tracking-[0.5em]`}
          />
          <button
            type="button"
            disabled={working}
            onClick={() =>
              sendCode(codeSent === "WHATSAPP" ? "SMS" : "WHATSAPP")
            }
            className="w-fit font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
          >
            Send it by {codeSent === "WHATSAPP" ? "SMS" : "WhatsApp"} instead
          </button>
        </div>
      ) : null}

      <FieldError id={`${ids.code}-error`} message={error ?? undefined} />

      {codeSent ? (
        <button type="submit" disabled={working} className={PRIMARY}>
          {working
            ? "Sending..."
            : apply
              ? "Send my application"
              : "Join Insiders"}
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-2 desk:grid-cols-2">
          <button type="submit" disabled={working} className={CODE_BUTTON}>
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
      )}
    </form>
  );
}
