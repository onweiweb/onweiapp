"use client";

import type { AddressView } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AddressForm } from "@/_components/commerce/AddressForm";
import { useCart } from "@/_components/commerce/CartProvider";
import { SignInPanel } from "@/_components/commerce/SignInPanel";
import { FieldError } from "@/_components/FieldError";

const BUTTON =
  "rounded-full border border-onwei-blue px-5 py-2 font-grotesk text-[length:max(0.75rem,11px)] uppercase";

export function NameEditor({ initial }: { initial: string | null }) {
  const router = useRouter();
  const { refreshSession } = useCart();
  const [editing, setEditing] = useState(!initial);
  const [name, setName] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="font-grotesk">{initial}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={BUTTON}
        >
          Edit
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }).catch(() => null);
        if (!response?.ok) {
          setError("Add your name, at least 2 letters.");
          return;
        }
        setEditing(false);
        await refreshSession();
        router.refresh();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Your name
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          autoComplete="name"
          placeholder="Your name"
          className="h-11 min-w-0 flex-1 rounded-full border border-onwei-blue bg-onwei-white px-4 font-grotesk text-[length:max(0.9375rem,16px)]"
        />
        <button
          type="submit"
          className="rounded-full bg-onwei-blue px-5 font-grotesk text-[length:max(0.75rem,11px)] uppercase text-onwei-beige"
        >
          Save
        </button>
      </div>
      <FieldError
        id={`${id}-error`}
        message={error ?? undefined}
        inset={false}
      />
    </form>
  );
}

export function AddContact({ kind }: { kind: "email" | "phone" }) {
  const router = useRouter();
  const { refreshSession } = useCart();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={BUTTON}>
        Add {kind === "email" ? "an email" : "a mobile number"}
      </button>
    );
  }
  return (
    <div className="rounded-[1rem] border border-onwei-blue/30 p-4">
      <SignInPanel
        mode="link"
        intro={`We'll send a code to check it's yours.`}
        onDone={async () => {
          setOpen(false);
          await refreshSession();
          router.refresh();
        }}
      />
    </div>
  );
}

export function AddressBook({
  initial,
  states,
}: {
  initial: AddressView[];
  states: readonly string[];
}) {
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(
    initial.length ? null : "new",
  );
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function remove(id: string) {
    if (confirming !== id) {
      setConfirming(id);
      return;
    }
    setConfirming(null);
    setBusy(true);
    const response = await fetch(`/api/account/addresses/${id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      const list = await fetch("/api/account/addresses").then(
        (r) => r.json() as Promise<{ addresses: AddressView[] }>,
      );
      setAddresses(list.addresses);
    }
  }

  async function makeDefault(address: AddressView) {
    setBusy(true);
    await fetch(`/api/account/addresses/${address.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...address,
        line2: address.line2 ?? "",
        isDefault: true,
      }),
    }).catch(() => null);
    const list = await fetch("/api/account/addresses").then(
      (r) => r.json() as Promise<{ addresses: AddressView[] }>,
    );
    setAddresses(list.addresses);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {addresses.map((address) =>
        editing === address.id ? (
          <AddressForm
            key={address.id}
            states={states}
            address={address}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setAddresses((list) =>
                list.map((a) => (a.id === saved.id ? saved : a)),
              );
              setEditing(null);
            }}
          />
        ) : (
          <div
            key={address.id}
            className="flex flex-col gap-3 rounded-[1rem] border border-onwei-blue/30 p-4 desk:flex-row desk:items-start desk:justify-between"
          >
            <p className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.5]">
              <span className="font-bold">{address.fullName}</span>
              {address.isDefault ? (
                <span className="ml-2 rounded-full bg-onwei-green px-2 py-0.5 text-[0.6875rem] uppercase">
                  Default
                </span>
              ) : null}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
              {address.state} {address.postalCode}
              <br />
              {address.phone}
            </p>
            <div className="flex flex-wrap gap-2">
              {!address.isDefault ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => makeDefault(address)}
                  className={BUTTON}
                >
                  Make default
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setEditing(address.id)}
                className={BUTTON}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(address.id)}
                className={`${BUTTON} ${confirming === address.id ? "bg-onwei-blue text-onwei-beige" : ""}`}
              >
                {confirming === address.id ? "Tap again to remove" : "Remove"}
              </button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <AddressForm
          states={states}
          onCancel={addresses.length ? () => setEditing(null) : undefined}
          onSaved={(saved) => {
            setAddresses((list) => [
              saved,
              ...list.map((a) =>
                saved.isDefault ? { ...a, isDefault: false } : a,
              ),
            ]);
            setEditing(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-fit font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-2"
        >
          + Add an address
        </button>
      )}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const { refresh, refreshSession } = useCart();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        await Promise.all([refresh(), refreshSession()]);
        router.push("/");
        router.refresh();
      }}
      className={BUTTON}
    >
      Sign out
    </button>
  );
}
