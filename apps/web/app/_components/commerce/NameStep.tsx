"use client";

import { useId, useState } from "react";
import { FieldError } from "../FieldError";
import { useCart } from "./CartProvider";

/** After a first sign-in: one field, skippable. */
export function NameStep({ onDone }: { onDone: () => void }) {
  const { refreshSession } = useCart();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const id = useId();

  return (
    <form
      className="flex flex-col gap-3 pr-6 text-onwei-blue"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }).catch(() => null);
        setSaving(false);
        if (!response?.ok) {
          setError("Add your name, at least 2 letters.");
          return;
        }
        await refreshSession();
        onDone();
      }}
    >
      <h2 className="font-display text-[length:max(1.75rem,22px)] font-bold uppercase leading-none">
        You&apos;re in.
      </h2>
      <label
        htmlFor={id}
        className="font-grotesk text-[length:max(0.875rem,12px)]"
      >
        What should we call you?
      </label>
      <input
        id={id}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError(null);
        }}
        autoComplete="name"
        className="h-12 w-full rounded-full border border-onwei-blue bg-onwei-white px-5 font-grotesk text-[length:max(0.9375rem,16px)] focus:outline-none focus-visible:ring-2 focus-visible:ring-onwei-blue"
      />
      <FieldError id={`${id}-error`} message={error ?? undefined} />
      <button
        type="submit"
        disabled={saving}
        className="flex h-12 items-center justify-center rounded-full bg-onwei-blue font-grotesk text-[length:max(0.875rem,12px)] uppercase text-onwei-beige disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-2"
      >
        Skip for now
      </button>
    </form>
  );
}
