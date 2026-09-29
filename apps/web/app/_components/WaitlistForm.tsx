"use client";

import { useId, useState } from "react";
import { Button } from "@onwei/ui";
import { WaitlistSuccessModal } from "./WaitlistSuccessModal";

type Status = "idle" | "submitting" | "success" | "already" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_NAME: "Enter your full name.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_PHONE: "Enter a valid phone number.",
  DUPLICATE_EMAIL:
    "That email is already on the list with a different phone number.",
  DUPLICATE_PHONE:
    "That phone number is already on the list with a different email.",
  RATE_LIMITED: "Too many attempts — try again in a few minutes.",
};

// Figma node 945:4323 (web) / 945:4451 (mobile) — "join onwei insiders".
// The movement-flex slider is decorative/fun, not required to submit.
export function WaitlistForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [movementFlex, setMovementFlex] = useState(50);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const sliderId = useId();
  const honeypotId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

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
          company,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        alreadyJoined?: boolean;
        reason?: string;
      };

      if (!data.ok) {
        setError(
          (data.reason && ERROR_MESSAGES[data.reason]) ??
            "Something went wrong. Please try again.",
        );
        setStatus("error");
        return;
      }

      setStatus(data.alreadyJoined ? "already" : "success");
      if (!data.alreadyJoined) setShowSuccessModal(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setMovementFlex(50);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <WaitlistSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <input
          id={honeypotId}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <label htmlFor={nameId} className="sr-only">
          Full name
        </label>
        <input
          id={nameId}
          type="text"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="FULL NAME"
          className="h-12 w-full rounded-[500px] border border-onwei-blue bg-transparent px-5 font-cta text-cta uppercase text-onwei-blue placeholder:text-onwei-blue focus:outline-none"
        />

        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="EMAIL ADDRESS"
          className="h-12 w-full rounded-[500px] border border-onwei-blue bg-transparent px-5 font-cta text-cta uppercase text-onwei-blue placeholder:text-onwei-blue focus:outline-none"
        />

        <label htmlFor={phoneId} className="sr-only">
          Phone number
        </label>
        <input
          id={phoneId}
          type="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="PHONE NUMBER"
          className="h-12 w-full rounded-[500px] border border-onwei-blue bg-transparent px-5 font-cta text-cta uppercase text-onwei-blue placeholder:text-onwei-blue focus:outline-none"
        />

        <div className="flex flex-col gap-3 rounded-[20px] bg-onwei-purple p-4 sm:p-[27px]">
          <label
            htmlFor={sliderId}
            className="font-cta text-[14px] font-medium leading-[1.3] tracking-[-0.14px] text-onwei-beige"
          >
            On a scale of &ldquo;walked to the fridge and back&rdquo; to
            &ldquo;ran an actual marathon&rdquo; - what&apos;s today&apos;s
            movement flex?
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={100}
            value={movementFlex}
            onChange={(event) => setMovementFlex(Number(event.target.value))}
            className="h-[6px] w-full cursor-pointer appearance-none rounded-full bg-onwei-beige/30 accent-onwei-beige"
          />
          <div className="flex items-center justify-between font-display text-[12px] font-medium uppercase text-onwei-beige">
            <span>fridge run</span>
            <span>full marathon</span>
          </div>
        </div>

        <Button
          type="submit"
          disabled={status === "submitting"}
          className="flex w-full items-center justify-center rounded-[30px] bg-onwei-blue px-6 py-3 font-grotesk text-[20px] uppercase text-onwei-green disabled:opacity-70 sm:text-[24px]"
        >
          {status === "submitting" ? "submitting..." : "start my warm up"}
        </Button>

        <p role="status" className="font-grotesk text-[12px] text-onwei-blue">
          {status === "success" &&
            "You're on the list — welcome to the warm up."}
          {status === "already" && "You're already on the list."}
          {status === "error" && error}
        </p>
      </form>
    </>
  );
}
