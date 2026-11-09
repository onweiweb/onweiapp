"use client";

import { useId, useState } from "react";
import { FieldError, INVALID_BORDER } from "@/_components/FieldError";
import { MESSAGE_INPUT, PILL_INPUT } from "@/_components/formStyles";
import { useFormTracking } from "../../lib/analytics/useFormTracking";

type Field = "fullName" | "email" | "phone" | "message";
const TRACKED_FIELDS = ["fullName", "email", "phone", "message"] as const;
const MESSAGE_MAX = 3000;

const FIELDS: {
  name: Field;
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
}[] = [
  {
    name: "fullName",
    label: "Full name",
    placeholder: "FULL NAME",
    autoComplete: "name",
  },
  {
    name: "email",
    label: "Email address",
    placeholder: "EMAIL ADDRESS",
    type: "email",
    autoComplete: "email",
  },
  {
    name: "phone",
    label: "Phone number (optional)",
    placeholder: "PHONE NUMBER",
    type: "tel",
    autoComplete: "tel",
  },
];

// Figma Contact Us (1189:6046): three pill fields, a message box and the
// navy "Start my warm up" button. Field errors come from the server's
// plain-language checks (validateContactInput in packages/core).
export function ContactForm() {
  const tracking = useFormTracking("contact", TRACKED_FIELDS);
  const baseId = useId();
  const [values, setValues] = useState<Record<Field, string>>({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [notice, setNotice] = useState<string | null>(null);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field])
      setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const company = new FormData(event.currentTarget).get("company");
    tracking.submitAttempt();
    setStatus("sending");
    setNotice(null);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, company: company || undefined }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      reason?: string;
      errors?: Partial<Record<Field, string>>;
    } | null;

    if (data?.ok) {
      tracking.submitSuccess();
      setStatus("sent");
      setValues({ fullName: "", email: "", phone: "", message: "" });
      return;
    }
    setStatus("error");
    if (data?.errors) {
      setErrors(data.errors);
      tracking.submitFailed("INVALID");
      return;
    }
    tracking.submitFailed(data?.reason ?? "NETWORK");
    setNotice(
      data?.reason === "RATE_LIMITED"
        ? "You've sent a few messages already. Give it a few minutes and try again."
        : "That didn't send. Check your connection and try again.",
    );
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3 text-onwei-blue">
        <p className="font-display text-[length:max(1.5rem,20px)] font-bold uppercase leading-none">
          Message sent.
        </p>
        <p className="font-grotesk text-[length:max(0.875rem,12px)] leading-[1.4]">
          Thanks for writing in. We reply within a working day, to the email you
          gave us.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="w-fit font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-4"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative flex w-full flex-col gap-4"
    >
      <input
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-624.9375rem] h-0 w-0 opacity-0"
      />
      {FIELDS.map((field) => {
        const id = `${baseId}-${field.name}`;
        const error = errors[field.name];
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="sr-only">
              {field.label}
            </label>
            <input
              id={id}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) => update(field.name, event.target.value)}
              onFocus={() => tracking.focus(field.name)}
              onBlur={() =>
                tracking.blur(field.name, values[field.name].trim().length > 0)
              }
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              placeholder={field.placeholder}
              className={`${error ? INVALID_BORDER : ""} ${PILL_INPUT}`}
            />
            <FieldError id={`${id}-error`} message={error} />
          </div>
        );
      })}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${baseId}-message`} className="sr-only">
          Your message
        </label>
        <textarea
          id={`${baseId}-message`}
          value={values.message}
          maxLength={MESSAGE_MAX}
          onChange={(event) => update("message", event.target.value)}
          onFocus={() => tracking.focus("message")}
          onBlur={() =>
            tracking.blur("message", values.message.trim().length > 0)
          }
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? `${baseId}-message-error` : undefined
          }
          placeholder="YOUR MESSAGE"
          className={`${errors.message ? INVALID_BORDER : ""} ${MESSAGE_INPUT}`}
        />
        <FieldError id={`${baseId}-message-error`} message={errors.message} />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase leading-none text-onwei-beige disabled:opacity-70"
      >
        {status === "sending" ? "sending..." : "start my warm up"}
      </button>
      {notice ? (
        <p
          role="alert"
          className="font-grotesk text-[length:max(0.8125rem,11px)] font-medium text-[#b91c1c]"
        >
          {notice}
        </p>
      ) : null}
    </form>
  );
}
