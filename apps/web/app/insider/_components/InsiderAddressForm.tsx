"use client";

import { useId, useState, type FormEvent } from "react";
import { FieldError } from "@/_components/FieldError";
import {
  INSIDER_FIELD_ERRORS,
  insiderErrorFor,
} from "../../../lib/messages/insider";

type Field = keyof typeof INSIDER_FIELD_ERRORS;

export interface AddressValues {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

const INPUT =
  "h-12 w-full rounded-[31.25rem] border bg-onwei-white px-5 font-grotesk text-[length:max(0.9375rem,16px)] text-onwei-blue placeholder:text-onwei-blue/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-onwei-blue";
const LABEL =
  "font-grotesk text-[length:max(0.75rem,11px)] uppercase tracking-[0.04em]";

/** Phone as typed back to the member: "+919876543210" shows as "98765 43210". */
function localPhone(e164: string): string {
  const digits = e164.replace(/^\+91/, "");
  return digits.length === 10
    ? `${digits.slice(0, 5)} ${digits.slice(5)}`
    : digits;
}

export function InsiderAddressForm({
  token,
  states,
  initial,
  onSaved,
}: {
  token: string;
  states: readonly string[];
  initial: AddressValues;
  onSaved: (values: AddressValues) => void;
}) {
  const baseId = useId();
  const [values, setValues] = useState<AddressValues>({
    ...initial,
    phone: initial.phone ? localPhone(initial.phone) : "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof AddressValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/insider/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...values }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
        fields?: Field[];
      };
      if (data.ok) {
        onSaved(values);
        return;
      }
      if (data.reason === "INVALID_FIELDS" && data.fields) {
        setErrors(
          Object.fromEntries(
            data.fields.map((field) => [field, INSIDER_FIELD_ERRORS[field]]),
          ),
        );
        document.getElementById(`${baseId}-${data.fields[0]}`)?.focus();
      }
      setFormError(insiderErrorFor(data.reason));
    } catch {
      setFormError(insiderErrorFor("NETWORK"));
    } finally {
      setSaving(false);
    }
  }

  function field(
    key: Field | "line2",
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) {
    const id = `${baseId}-${key}`;
    const error = key === "line2" ? undefined : errors[key];
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        <input
          id={id}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${INPUT} ${error ? "border-[#b91c1c]" : "border-onwei-blue"}`}
          {...props}
        />
        <FieldError id={`${id}-error`} message={error} />
      </div>
    );
  }

  const stateId = `${baseId}-state`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {field("fullName", "Name on the parcel", {
        autoComplete: "name",
        required: true,
      })}
      {field("phone", "Mobile number", {
        type: "tel",
        inputMode: "numeric",
        autoComplete: "tel-national",
        placeholder: "98765 43210",
        required: true,
      })}
      {field("line1", "House or flat, street", {
        autoComplete: "address-line1",
        required: true,
      })}
      {field("line2", "Area or landmark (optional)", {
        autoComplete: "address-line2",
      })}
      <div className="grid grid-cols-1 gap-4 desk:grid-cols-2">
        {field("postalCode", "PIN code", {
          inputMode: "numeric",
          autoComplete: "postal-code",
          maxLength: 6,
          placeholder: "400050",
          required: true,
        })}
        {field("city", "City or town", {
          autoComplete: "address-level2",
          required: true,
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={stateId} className={LABEL}>
          State
        </label>
        <select
          id={stateId}
          value={values.state}
          onChange={(event) => set("state", event.target.value)}
          autoComplete="address-level1"
          aria-invalid={Boolean(errors.state)}
          aria-describedby={errors.state ? `${stateId}-error` : undefined}
          className={`${INPUT} appearance-none ${errors.state ? "border-[#b91c1c]" : "border-onwei-blue"}`}
        >
          <option value="">Choose your state</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <FieldError id={`${stateId}-error`} message={errors.state} />
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-[1rem] bg-onwei-blue px-5 py-3 font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.4] text-onwei-beige"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-[31.25rem] bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.06em] text-onwei-beige transition-opacity disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save my address"}
      </button>
    </form>
  );
}
