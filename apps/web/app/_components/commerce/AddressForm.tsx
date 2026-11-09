"use client";

import type { AddressView } from "@onwei/core";
import { useId, useState } from "react";
import { FieldError } from "../FieldError";
import {
  ADDRESS_FIELD_ERRORS,
  CHECKOUT_ERRORS,
} from "../../../lib/messages/commerce";

type Field =
  "fullName" | "phone" | "line1" | "line2" | "city" | "state" | "postalCode";

const INPUT =
  "h-12 w-full rounded-full border bg-onwei-white px-5 font-grotesk text-[length:max(0.9375rem,16px)] text-onwei-blue placeholder:text-onwei-blue/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-onwei-blue";
const LABEL =
  "font-grotesk text-[length:max(0.75rem,11px)] uppercase tracking-[0.04em]";

function localPhone(e164: string): string {
  const digits = e164.replace(/^\+91/, "");
  return digits.length === 10
    ? `${digits.slice(0, 5)} ${digits.slice(5)}`
    : digits;
}

/** Add or edit a delivery address. Saves to the account, then hands it back. */
export function AddressForm({
  states,
  address,
  defaultName,
  defaultPhone,
  onSaved,
  onCancel,
  submitLabel = "Save address",
}: {
  states: readonly string[];
  address?: AddressView;
  defaultName?: string | null;
  defaultPhone?: string | null;
  onSaved: (address: AddressView) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const baseId = useId();
  const [values, setValues] = useState({
    fullName: address?.fullName ?? defaultName ?? "",
    phone: address?.phone
      ? localPhone(address.phone)
      : defaultPhone
        ? localPhone(defaultPhone)
        : "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postalCode: address?.postalCode ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(key: Field, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const response = await fetch(
      address
        ? `/api/account/addresses/${address.id}`
        : "/api/account/addresses",
      {
        method: address ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    ).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      address?: AddressView;
      reason?: string;
      fields?: Field[];
    } | null;
    setSaving(false);
    if (data?.ok && data.address) {
      onSaved(data.address);
      return;
    }
    if (data?.fields?.length) {
      setErrors(
        Object.fromEntries(
          data.fields.map((f) => [f, ADDRESS_FIELD_ERRORS[f]]),
        ),
      );
      document.getElementById(`${baseId}-${data.fields[0]}`)?.focus();
      return;
    }
    setFormError(CHECKOUT_ERRORS.NETWORK!);
  }

  function input(
    key: Field,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) {
    const id = `${baseId}-${key}`;
    const error = errors[key];
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
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 text-onwei-blue"
    >
      <div className="grid grid-cols-1 gap-4 desk:grid-cols-2">
        {input("fullName", "Full name", { autoComplete: "name" })}
        {input("phone", "Mobile number", {
          type: "tel",
          inputMode: "numeric",
          autoComplete: "tel-national",
          placeholder: "98765 43210",
        })}
      </div>
      {input("line1", "House or flat, street", {
        autoComplete: "address-line1",
      })}
      {input("line2", "Area or landmark (optional)", {
        autoComplete: "address-line2",
      })}
      <div className="grid grid-cols-1 gap-4 desk:grid-cols-3">
        {input("postalCode", "PIN code", {
          inputMode: "numeric",
          autoComplete: "postal-code",
          maxLength: 6,
          placeholder: "400050",
        })}
        {input("city", "City or town", { autoComplete: "address-level2" })}
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
            className={`${INPUT} appearance-none ${errors.state ? "border-[#b91c1c]" : "border-onwei-blue"}`}
          >
            <option value="">Choose</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <FieldError id={`${stateId}-error`} message={errors.state} />
        </div>
      </div>
      {formError ? (
        <p
          role="alert"
          className="font-grotesk text-[length:max(0.8125rem,11px)] text-[#b91c1c]"
        >
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex h-12 items-center justify-center rounded-full bg-onwei-blue px-8 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige disabled:opacity-60"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-12 items-center justify-center rounded-full border border-onwei-blue px-8 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
