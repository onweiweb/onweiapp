"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StaffRoleAssignment({
  staffUserId,
  allRoles,
  assignedRoleIds,
}: {
  staffUserId: string;
  allRoles: { id: string; name: string }[];
  assignedRoleIds: string[];
}) {
  const router = useRouter();
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assigned = new Set(assignedRoleIds);

  async function toggle(roleId: string, isAssigned: boolean) {
    setError(null);
    setPendingRoleId(roleId);
    try {
      const response = isAssigned
        ? await fetch(`/api/staff/${staffUserId}/roles?roleId=${roleId}`, {
            method: "DELETE",
          })
        : await fetch(`/api/staff/${staffUserId}/roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleId }),
          });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setPendingRoleId(null);
        return;
      }
      setPendingRoleId(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPendingRoleId(null);
    }
  }

  if (allRoles.length === 0) {
    return (
      <p className="text-sm text-onwei-blue/60">
        No roles exist yet — create one on the Roles page first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {allRoles.map((role) => {
        const isAssigned = assigned.has(role.id);
        return (
          <label key={role.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAssigned}
              disabled={pendingRoleId === role.id}
              onChange={() => toggle(role.id, isAssigned)}
            />
            {role.name}
          </label>
        );
      })}
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
