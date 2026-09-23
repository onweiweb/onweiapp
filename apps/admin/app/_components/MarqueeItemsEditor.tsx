"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput } from "./ui";

export interface MarqueeItemRow {
  id: string;
  label: string;
}

// One instance per marquee (HOME_HERO / HOME_SHOWCASE / PDP) — same ticker
// text list shape everywhere, just a different placement.
export function MarqueeItemsEditor({
  placement,
  items,
}: {
  placement: "HOME_HERO" | "HOME_SHOWCASE" | "PDP";
  items: MarqueeItemRow[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function add() {
    if (!label.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/content/marquee-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placement, label }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Couldn't add that line.");
        return;
      }
      setLabel("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setSubmitting(true);
    await fetch(`/api/content/marquee-items/${id}`, { method: "DELETE" });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm">{item.label}</span>
              <AdminButton
                type="button"
                variant="danger"
                disabled={submitting}
                onClick={() => remove(item.id)}
              >
                Remove
              </AdminButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-onwei-blue/70">No lines yet.</p>
      )}

      <div className="flex items-end gap-3">
        <AdminInput
          placeholder="Ticker text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <AdminButton type="button" disabled={submitting} onClick={add}>
          Add
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
