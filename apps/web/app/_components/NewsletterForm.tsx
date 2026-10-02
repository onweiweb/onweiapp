"use client";

import { useId, useState } from "react";
import { Button } from "@onwei/ui";
import { ConsentCheckbox } from "./ConsentCheckbox";

type Status = "idle" | "submitting" | "success" | "already" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const inputId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        alreadySubscribed?: boolean;
        reason?: string;
      };

      if (!data.ok) {
        setStatus("error");
        return;
      }

      setStatus(data.alreadySubscribed ? "already" : "success");
      setEmail("");
      setConsent(false);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[26.5625rem] flex-col items-start gap-4"
    >
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <input
        id={inputId}
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="EMAIL ADDRESS"
        className="h-12 w-full rounded-[31.25rem] border border-onwei-beige bg-transparent px-5 font-cta text-cta uppercase text-onwei-beige placeholder:text-onwei-beige placeholder:opacity-100 focus:outline-none"
      />
      <ConsentCheckbox
        checked={consent}
        onChange={setConsent}
        tone="beige"
        lead="I agree to receive Onwei emails and accept the"
        links={["privacy"]}
      />
      <Button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-beige px-6 py-3 font-grotesk text-label uppercase text-onwei-purple disabled:opacity-70"
      >
        {status === "submitting" ? "submitting..." : "submit"}
      </Button>
      <p
        role="status"
        className="font-grotesk text-[length:max(0.75rem,11px)] text-onwei-beige"
      >
        {status === "success" && "You're on the list, welcome to Onwei."}
        {status === "already" && "You're already subscribed."}
        {status === "error" && "Something went wrong. Please try again."}
      </p>
    </form>
  );
}
