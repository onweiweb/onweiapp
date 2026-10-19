"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput, Field } from "../_components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-onwei-beige px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-[24px] bg-onwei-white p-8 shadow-sm">
        <Image
          src="/images/header/logo.svg"
          alt="Onwei"
          width={71}
          height={33}
        />
        <h1 className="font-display text-xl font-semibold uppercase">
          Sign in
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Work email">
            <AdminInput
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <AdminInput
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>

          {error ? (
            <p role="alert" className="text-sm text-onwei-black">
              {error}
            </p>
          ) : null}

          <AdminButton type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </AdminButton>
        </form>
        <p className="text-sm text-onwei-blue/70">
          Use the email and password your manager set up for you. Trouble
          signing in? Contact your admin.
        </p>
      </div>
    </main>
  );
}
