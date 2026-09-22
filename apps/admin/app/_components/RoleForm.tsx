"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput } from "./ui";

export function RoleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a name for this role.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        role?: { id: string };
      };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      router.push(`/roles/${data.role!.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <AdminInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Warehouse staff"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (optional)
        <AdminInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      <AdminButton type="submit" disabled={submitting} className="self-start">
        {submitting ? "Creating…" : "Create role"}
      </AdminButton>
    </form>
  );
}
