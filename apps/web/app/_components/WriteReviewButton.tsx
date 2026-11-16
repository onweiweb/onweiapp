"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { CTA_PILL } from "./CtaLink";
import { MESSAGE_INPUT, PILL_INPUT } from "./formStyles";

/**
 * "Write a review" button and its popup (client feedback 2026-11-16). Anyone
 * with a valid email can write one; it shows on the site only after staff
 * approve it in admin Reviews. No Figma frame: built from the storefront form
 * styles (formStyles.ts) on the purple popup surface used elsewhere.
 */
export interface ReviewProductOption {
  id: string;
  name: string;
}

const ERRORS: Record<string, string> = {
  INVALID_RATING: "Pick a star rating.",
  TITLE_TOO_LONG: "Keep the title under 80 characters.",
  BODY_TOO_SHORT: "Tell us a little more (at least 10 characters).",
  BODY_TOO_LONG: "That's a bit long, please keep it under 1500 characters.",
  INVALID_NAME: "Add the name you'd like shown (up to 40 characters).",
  INVALID_EMAIL: "That email doesn't look right.",
  UNKNOWN_PRODUCT: "That product isn't available, pick another.",
  CONSENT_REQUIRED: "Please tick the box to continue.",
  RATE_LIMITED: "You've sent a few reviews already, try again in an hour.",
};

type Status = "idle" | "sending" | "done" | "error";

export function WriteReviewButton({
  products = [],
  productId,
  className = "",
  label = "write a review",
}: {
  /** Products to pick from. Empty with no productId means a brand review. */
  products?: ReviewProductOption[];
  /** Fixed product (product page), hides the picker. */
  productId?: string;
  className?: string;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState(productId ?? "");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function reset() {
    setRating(0);
    setTitle("");
    setBody("");
    setName("");
    setEmail("");
    setPicked(productId ?? "");
    setConsent(false);
    setStatus("idle");
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) {
      setError(ERRORS.INVALID_RATING!);
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title: title || undefined,
          body,
          name,
          email,
          productId: picked || undefined,
          consent,
          website,
        }),
      });
      const data = (await response.json()) as { ok: boolean; reason?: string };
      if (data.ok) {
        setStatus("done");
        return;
      }
      setStatus("error");
      setError(
        ERRORS[data.reason ?? ""] ?? "Something went wrong, please try again.",
      );
    } catch {
      setStatus("error");
      setError("Something went wrong, please try again.");
    }
  }

  const label12 =
    "font-grotesk text-[length:max(0.8125rem,11px)] uppercase text-onwei-blue";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={`${CTA_PILL} cursor-pointer ${className}`}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-[32rem] rounded-[1.875rem] bg-onwei-beige p-0 text-onwei-blue backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-5 px-5 py-8 desk:px-10 desk:py-10">
          <div className="flex items-start justify-between gap-4">
            <h2
              id={headingId}
              className="font-display text-[2rem] font-bold uppercase leading-[0.95]"
            >
              {status === "done" ? "Thank you!" : "Write a review"}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="cursor-pointer font-grotesk text-[1.5rem] leading-none"
            >
              ×
            </button>
          </div>

          {status === "done" ? (
            <>
              <p className="font-grotesk text-body">
                Thanks for taking the time. We read every review, and yours will
                show on the site once we&apos;ve had a look.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${CTA_PILL} w-full cursor-pointer bg-onwei-blue text-onwei-beige`}
              >
                close
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className={`${label12} mb-2`}>Your rating</legend>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      aria-pressed={rating === star}
                      className={`cursor-pointer text-[2rem] leading-none ${star <= rating ? "text-onwei-blue" : "text-onwei-blue/25"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </fieldset>

              {!productId && products.length > 0 ? (
                <label className="flex flex-col gap-2">
                  <span className={label12}>Which product?</span>
                  <select
                    value={picked}
                    onChange={(event) => setPicked(event.target.value)}
                    className={PILL_INPUT}
                  >
                    <option value="">Onwei in general</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                placeholder="Title (optional)"
                aria-label="Title (optional)"
                className={PILL_INPUT}
              />
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                minLength={10}
                maxLength={1500}
                placeholder="Your review"
                aria-label="Your review"
                className={`${MESSAGE_INPUT} h-36`}
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={40}
                placeholder="Name to show"
                aria-label="Name to show"
                className={PILL_INPUT}
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="Email (not shown)"
                aria-label="Email, not shown on the site"
                className={PILL_INPUT}
              />
              {/* Hidden from people, bots fill it in. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                name="website"
              />
              <ConsentCheckbox
                checked={consent}
                onChange={setConsent}
                lead="I agree to Onwei showing this review with my name, and accept the"
                links={["privacy"]}
              />
              {error ? (
                <p
                  role="alert"
                  className="font-grotesk text-[length:max(0.8125rem,11px)] text-red-700"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={status === "sending"}
                className={`${CTA_PILL} w-full cursor-pointer bg-onwei-blue text-onwei-beige disabled:opacity-70`}
              >
                {status === "sending" ? "sending..." : "send review"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
