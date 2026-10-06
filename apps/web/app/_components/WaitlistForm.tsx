"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@onwei/ui";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { FieldError, INVALID_BORDER } from "./FieldError";
import { WaitlistSuccessModal } from "./WaitlistSuccessModal";
import { getFirstTouch } from "../../lib/analytics/attribution";
import { useFormTracking } from "../../lib/analytics/useFormTracking";

const MotionButton = motion.create(Button);

type Status = "idle" | "submitting" | "success" | "already" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_NAME: "Enter your full name.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_PHONE: "Enter a valid phone number.",
  DUPLICATE_EMAIL:
    "This email is already on the list with a different phone number. Use the phone number you signed up with.",
  DUPLICATE_PHONE:
    "This phone number is already on the list with a different email. Use the email you signed up with.",
  CONSENT_REQUIRED: "Tick the box to agree before joining.",
  RATE_LIMITED: "Too many attempts, try again in a few minutes.",
};

type Field = "name" | "email" | "phone";
type FieldErrors = Partial<Record<Field, string>>;

const REASON_FIELD: Record<string, Field> = {
  INVALID_NAME: "name",
  INVALID_EMAIL: "email",
  DUPLICATE_EMAIL: "email",
  INVALID_PHONE: "phone",
  DUPLICATE_PHONE: "phone",
};

const TRACKED_FIELDS = ["name", "email", "phone"] as const;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Figma node 945:4323 (web) / 945:4451 (mobile), "join onwei insiders".
// The movement-flex slider is decorative/fun, not required to submit.
export function WaitlistForm({
  instagramUrl = null,
}: {
  instagramUrl?: string | null;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [movementFlex, setMovementFlex] = useState(50);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const tracking = useFormTracking("waitlist", TRACKED_FIELDS);
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const sliderId = useId();
  const honeypotId = useId();

  function setFieldError(field: Field, message?: string) {
    setFieldErrors((current) => {
      if (current[field] === message) return current;
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function focusField(field: Field) {
    const id = { name: nameId, email: emailId, phone: phoneId }[field];
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    tracking.submitAttempt();
    setStatus("submitting");
    setError(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const company = (form.elements.namedItem("company") as HTMLInputElement)
      ?.value;

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          movementFlex,
          consent,
          company,
          attribution: getFirstTouch(),
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        alreadyJoined?: boolean;
        reason?: string;
      };

      if (!data.ok) {
        const message =
          (data.reason && ERROR_MESSAGES[data.reason]) ??
          "Something went wrong. Please try again.";
        const field = data.reason ? REASON_FIELD[data.reason] : undefined;
        tracking.submitFailed(data.reason ?? "UNKNOWN");
        if (field) {
          tracking.fieldError(field, data.reason ?? "UNKNOWN");
          setFieldErrors({ [field]: message });
          focusField(field);
        } else {
          setError(message);
        }
        setStatus("error");
        return;
      }

      tracking.submitSuccess();
      setStatus(data.alreadyJoined ? "already" : "success");
      if (!data.alreadyJoined) setShowSuccessModal(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setMovementFlex(50);
      setConsent(false);
    } catch {
      tracking.submitFailed("NETWORK");
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <WaitlistSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        instagramUrl={instagramUrl}
      />
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <input
          id={honeypotId}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-624.9375rem] h-0 w-0 opacity-0"
        />

        <label htmlFor={nameId} className="sr-only">
          Full name
        </label>
        <input
          id={nameId}
          type="text"
          required
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setFieldError("name");
          }}
          onFocus={() => tracking.focus("name")}
          onBlur={() => tracking.blur("name", fullName.trim().length > 0)}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
          placeholder="FULL NAME"
          className={`${fieldErrors.name ? INVALID_BORDER : ""} h-12 w-full rounded-[31.25rem] border border-onwei-blue bg-transparent px-5 font-cta text-cta uppercase text-onwei-blue placeholder:text-onwei-blue focus:outline-none`}
        />
        <FieldError id={`${nameId}-error`} message={fieldErrors.name} />

        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldError("email");
          }}
          onFocus={() => tracking.focus("email")}
          onBlur={() => {
            if (email.trim() && !EMAIL_SHAPE.test(email.trim())) {
              setFieldError("email", ERROR_MESSAGES.INVALID_EMAIL);
              tracking.fieldError("email", "INVALID_EMAIL");
            } else {
              tracking.blur("email", email.trim().length > 0);
            }
          }}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
          placeholder="EMAIL ADDRESS"
          className={`${fieldErrors.email ? INVALID_BORDER : ""} h-12 w-full rounded-[31.25rem] border border-onwei-blue bg-transparent px-5 font-cta text-cta uppercase tracking-[0.0312rem] text-onwei-blue placeholder:text-onwei-blue focus:outline-none`}
        />
        <FieldError id={`${emailId}-error`} message={fieldErrors.email} />

        <label htmlFor={phoneId} className="sr-only">
          Phone number
        </label>
        <input
          id={phoneId}
          type="tel"
          required
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setFieldError("phone");
          }}
          onFocus={() => tracking.focus("phone")}
          onBlur={() => tracking.blur("phone", phone.trim().length > 0)}
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={fieldErrors.phone ? `${phoneId}-error` : undefined}
          placeholder="PHONE NUMBER"
          className={`${fieldErrors.phone ? INVALID_BORDER : ""} h-12 w-full rounded-[31.25rem] border border-onwei-blue bg-transparent px-5 font-cta text-cta uppercase text-onwei-blue placeholder:text-onwei-blue focus:outline-none`}
        />
        <FieldError id={`${phoneId}-error`} message={fieldErrors.phone} />

        <div className="flex flex-col gap-3 rounded-[1.25rem] bg-onwei-purple p-4 desk:p-[1.6875rem]">
          <label
            htmlFor={sliderId}
            className="font-cta text-[length:max(0.875rem,11px)] font-medium leading-[1.3] tracking-[-0.0088rem] text-onwei-beige"
          >
            On a scale of &ldquo;walked to the fridge and back&rdquo; to
            &ldquo;ran an actual marathon&rdquo; - what&apos;s today&apos;s
            movement flex?
          </label>
          {/* Figma shows a two-tone track: a solid fill from the left edge
              up to the thumb, a faint unfilled remainder past it, not a
              single uniform translucent bar. The native range input can't
              paint that split on its own, so its own track is made fully
              transparent and two sibling divs (faint full-width, solid
              width-by-movementFlex%) paint it underneath. */}
          {/* Thumb is styled explicitly (1.5rem x 1rem beige pill) so every
              browser draws the same handle iPhone Safari does,
              instead of each browser's own accent-color thumb. The fill
              ends at the thumb's centre: half a thumb plus the share of the
              remaining track. */}
          <div className="relative flex h-6 w-full items-center">
            <div className="pointer-events-none absolute inset-x-0 h-[0.375rem] rounded-full bg-onwei-beige/30" />
            <div
              className="pointer-events-none absolute left-0 h-[0.375rem] rounded-full bg-onwei-beige"
              style={{
                width: `calc(0.75rem + (100% - 1.5rem) * ${movementFlex / 100})`,
              }}
            />
            <input
              id={sliderId}
              type="range"
              min={0}
              max={100}
              value={movementFlex}
              onChange={(event) => setMovementFlex(Number(event.target.value))}
              className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-onwei-beige [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-[0.375rem] [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[0.3125rem] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-onwei-beige"
            />
          </div>
          <div className="flex items-center justify-between font-display text-[length:max(0.75rem,11px)] font-medium uppercase text-onwei-beige">
            <span>fridge run</span>
            <span>full marathon</span>
          </div>
        </div>

        <ConsentCheckbox
          checked={consent}
          onChange={setConsent}
          lead="I agree to Onwei contacting me about the launch and accept the"
          links={["privacy"]}
        />

        <MotionButton
          type="submit"
          disabled={status === "submitting"}
          whileHover={status === "submitting" ? undefined : { scale: 1.02 }}
          whileTap={status === "submitting" ? undefined : { scale: 0.98 }}
          className="flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-[1.25rem] uppercase text-onwei-green disabled:opacity-70 desk:text-[1.5rem]"
        >
          {status === "submitting" ? "submitting..." : "start my warm up"}
        </MotionButton>

        <p
          role="status"
          className={
            status === "already"
              ? "font-grotesk text-[length:max(0.9375rem,11px)] font-bold text-[#b91c1c]"
              : "font-grotesk text-[length:max(0.75rem,11px)] text-onwei-blue"
          }
        >
          {status === "success" &&
            "You're on the list, welcome to the warm up."}
          {status === "already" && "You're already on the list."}
          {status === "error" && error}
        </p>
      </form>
    </>
  );
}
