"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, useToast } from "../../_components/ui";

type Mode = "ADD" | "BEST";

const OPTIONS: { mode: Mode; title: string; example: string }[] = [
  {
    mode: "ADD",
    title: "Add on top",
    example:
      "Insiders get their % on top of every other offer. Pre-order 15% + Insider 5% = 20% off.",
  },
  {
    mode: "BEST",
    title: "Bigger one wins",
    example:
      "Insiders get their % or the other offer, whichever saves more. Pre-order 15% vs Insider 5% = 15% off.",
  },
];

export function StackModeForm({
  initial,
  canManage,
}: {
  initial: Mode;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initial);
  const [baseline, setBaseline] = useState<Mode>(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/discounts/insider-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      toast("That didn't save. Try again.", "error");
      return;
    }
    setBaseline(mode);
    toast("Saved. The next checkout uses it.", "success");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 md:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.mode}
            className={`flex cursor-pointer gap-3 rounded-[20px] border p-4 ${
              mode === option.mode
                ? "border-onwei-blue bg-onwei-beige/60"
                : "border-onwei-blue/20"
            } ${canManage ? "" : "cursor-not-allowed opacity-70"}`}
          >
            <input
              type="radio"
              name="stackMode"
              className="mt-1"
              checked={mode === option.mode}
              disabled={!canManage}
              onChange={() => setMode(option.mode)}
            />
            <span>
              <span className="block font-semibold text-onwei-blue">
                {option.title}
              </span>
              <span className="block text-sm text-onwei-blue/70">
                {option.example}
              </span>
            </span>
          </label>
        ))}
      </div>
      {canManage ? (
        <AdminButton
          type="button"
          className="w-fit"
          disabled={saving || mode === baseline}
          onClick={save}
        >
          {saving ? "Saving..." : "Save"}
        </AdminButton>
      ) : null}
    </div>
  );
}
