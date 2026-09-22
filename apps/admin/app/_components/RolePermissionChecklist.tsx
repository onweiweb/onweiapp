"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "./ui";

export function RolePermissionChecklist({
  roleId,
  allPermissionKeys,
  initialKeys,
}: {
  roleId: string;
  allPermissionKeys: string[];
  initialKeys: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(initialKeys));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const groups = new Map<string, string[]>();
  for (const key of allPermissionKeys) {
    const domain = key.split(":")[0] ?? key;
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain)!.push(key);
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKeys: [...selected] }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([domain, keys]) => (
        <div key={domain}>
          <p className="mb-1 text-xs font-semibold uppercase text-onwei-blue/60">
            {domain}
          </p>
          <div className="flex flex-col gap-1">
            {keys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      ))}
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
      <AdminButton
        type="button"
        disabled={submitting}
        onClick={handleSave}
        className="self-start"
      >
        {submitting ? "Saving…" : "Save permissions"}
      </AdminButton>
    </div>
  );
}
