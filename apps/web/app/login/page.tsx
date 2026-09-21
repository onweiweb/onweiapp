"use client";

import { Button } from "@onwei/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "identifier" | "code";

function detectChannel(identifier: string): "EMAIL" | "SMS" {
  return identifier.includes("@") ? "EMAIL" : "SMS";
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: detectChannel(identifier),
        }),
      });
      if (!response.ok) {
        setError("Something went wrong sending your code. Try again.");
        return;
      }
      setStep("code");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: detectChannel(identifier),
          code: code.trim(),
        }),
      });
      const data = (await response.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        setError(
          data.reason === "MAX_ATTEMPTS_EXCEEDED"
            ? "Too many incorrect attempts. Request a new code."
            : data.reason === "EXPIRED"
              ? "That code has expired. Request a new one."
              : "That code didn't match. Try again.",
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="font-[family-name:var(--font-raleway)] text-2xl font-semibold text-[var(--color-onwei-blue)]">
        Sign in
      </h1>

      {step === "identifier" && (
        <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-[var(--color-onwei-black)]">
            Email or phone
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              className="rounded-md border border-[var(--color-onwei-blue)] bg-[var(--color-onwei-white)] px-3 py-2 text-[var(--color-onwei-black)] outline-none focus:ring-2 focus:ring-[var(--color-onwei-purple)]"
              placeholder="you@example.com or +91..."
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[var(--color-onwei-blue)] px-4 py-2 text-[var(--color-onwei-white)] disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send code"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-onwei-black)]">
            We sent a code to <strong>{identifier}</strong>.
          </p>
          <label className="flex flex-col gap-2 text-sm text-[var(--color-onwei-black)]">
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              className="rounded-md border border-[var(--color-onwei-blue)] bg-[var(--color-onwei-white)] px-3 py-2 tracking-widest text-[var(--color-onwei-black)] outline-none focus:ring-2 focus:ring-[var(--color-onwei-purple)]"
              placeholder="123456"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[var(--color-onwei-blue)] px-4 py-2 text-[var(--color-onwei-white)] disabled:opacity-50"
          >
            {isSubmitting ? "Verifying…" : "Verify"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("identifier")}
            className="text-sm text-[var(--color-onwei-purple)] underline"
          >
            Use a different email or phone
          </button>
        </form>
      )}
    </main>
  );
}
