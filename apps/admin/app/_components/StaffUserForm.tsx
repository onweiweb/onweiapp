"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput } from "./ui";

export function StaffUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !name.trim() || initialPassword.length < 8) {
      setError(
        "Enter an email, a name, and a password of at least 8 characters.",
      );
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          initialPassword,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        staffUser?: { id: string };
      };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      router.push(`/staff/${data.staffUser!.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <AdminInput
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Name
        <AdminInput
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Initial password (they can change it after signing in)
        <AdminInput
          type="text"
          value={initialPassword}
          onChange={(event) => setInitialPassword(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      <AdminButton type="submit" disabled={submitting} className="self-start">
        {submitting ? "Creating…" : "Create account"}
      </AdminButton>
    </form>
  );
}
