"use client";

import type { InviteRewardRuleView } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminBadge,
  AdminButton,
  AdminDialog,
  AdminInput,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  Field,
  useConfirm,
  useToast,
} from "../_components/ui";

type RewardType = InviteRewardRuleView["rewardType"];

interface Item {
  id: string;
  name: string;
  stock: number;
}

interface FormState {
  invites: string;
  rewardType: RewardType;
  value: string;
  freeVariantId: string;
  validDays: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  invites: "10",
  rewardType: "AMOUNT_OFF",
  value: "500",
  freeVariantId: "",
  validDays: "90",
  isActive: true,
};

function describe(rule: InviteRewardRuleView, items: Item[]): string {
  if (rule.rewardType === "AMOUNT_OFF")
    return `₹${(rule.value ?? 0).toLocaleString("en-IN")} off`;
  if (rule.rewardType === "PERCENT_OFF") return `${rule.value}% off`;
  const item = items.find((i) => i.id === rule.freeVariantId);
  return `Free ${item?.name ?? "item (no longer listed)"}`;
}

export function RewardRules({
  rules,
  items,
  canManage,
}: {
  rules: InviteRewardRuleView[];
  items: Item[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function open(rule: InviteRewardRuleView | null) {
    setErrors({});
    setForm(
      rule
        ? {
            invites: String(rule.invites),
            rewardType: rule.rewardType,
            value: rule.value === null ? "" : String(rule.value),
            freeVariantId: rule.freeVariantId ?? "",
            validDays: String(rule.validDays),
            isActive: rule.isActive,
          }
        : EMPTY,
    );
    setEditing({ id: rule?.id ?? null });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    const response = await fetch(
      editing.id
        ? `/api/insiders/rewards/${editing.id}`
        : "/api/insiders/rewards",
      {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: Number(form.invites),
          rewardType: form.rewardType,
          value:
            form.rewardType === "FREE_ITEM" || form.value === ""
              ? null
              : Number(form.value),
          freeVariantId:
            form.rewardType === "FREE_ITEM" ? form.freeVariantId || null : null,
          validDays: Number(form.validDays),
          isActive: form.isActive,
        }),
      },
    ).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      errors?: Record<string, string>;
    } | null;
    if (!response?.ok || !data?.ok) {
      setErrors(data?.errors ?? {});
      toast(data?.error ?? "Check the fields marked below.", "error");
      return;
    }
    toast(editing.id ? "Reward saved." : "Reward added.", "success");
    setEditing(null);
    router.refresh();
  }

  async function switchOff(rule: InviteRewardRuleView, items: Item[]) {
    const ok = await confirm({
      title: `Switch off "${rule.invites} invites: ${describe(rule, items)}"?`,
      message:
        "Nobody new gets it. Codes already given keep working until they end.",
      confirmLabel: "Switch off",
      danger: true,
    });
    if (!ok) return;
    const response = await fetch(`/api/insiders/rewards/${rule.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!response?.ok) {
      toast("That didn't work. Try again.", "error");
      return;
    }
    toast("Reward switched off.", "success");
    router.refresh();
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex flex-col gap-3">
      {rules.length === 0 ? (
        <p className="text-sm text-onwei-blue/70">
          No rewards yet. Add one, for example 10 invites for ₹500 off and 25
          invites for a free item.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Invites</AdminTableHeaderCell>
            <AdminTableHeaderCell>Reward</AdminTableHeaderCell>
            <AdminTableHeaderCell>Code lasts</AdminTableHeaderCell>
            <AdminTableHeaderCell>Given so far</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            {canManage ? (
              <AdminTableHeaderCell>
                <span className="sr-only">Actions</span>
              </AdminTableHeaderCell>
            ) : null}
          </AdminTableHead>
          <tbody>
            {rules.map((rule) => (
              <AdminTableRow key={rule.id}>
                <AdminTableCell>{rule.invites}</AdminTableCell>
                <AdminTableCell>{describe(rule, items)}</AdminTableCell>
                <AdminTableCell>{rule.validDays} days</AdminTableCell>
                <AdminTableCell>{rule.granted}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={rule.isActive ? "success" : "pending"}>
                    {rule.isActive ? "On" : "Off"}
                  </AdminBadge>
                </AdminTableCell>
                {canManage ? (
                  <AdminTableCell>
                    <div className="flex gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={() => open(rule)}
                      >
                        Edit
                      </AdminButton>
                      {rule.isActive ? (
                        <AdminButton
                          type="button"
                          variant="secondary"
                          onClick={() => switchOff(rule, items)}
                        >
                          Switch off
                        </AdminButton>
                      ) : null}
                    </div>
                  </AdminTableCell>
                ) : null}
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
      {canManage ? (
        <div>
          <AdminButton type="button" onClick={() => open(null)}>
            Add a reward
          </AdminButton>
        </div>
      ) : null}

      <AdminDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit reward" : "Add a reward"}
        description="Given when a member reaches this many invites."
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Invites needed"
            hint="People who became Insiders with this member's number."
            error={errors.invites}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.invites}
              onChange={(e) => set("invites", e.target.value)}
            />
          </Field>
          <Field label="Reward" error={errors.rewardType}>
            <AdminSelect
              value={form.rewardType}
              onChange={(e) => set("rewardType", e.target.value as RewardType)}
            >
              <option value="AMOUNT_OFF">Money off (₹)</option>
              <option value="PERCENT_OFF">Percentage off</option>
              <option value="FREE_ITEM">A free item from stock</option>
            </AdminSelect>
          </Field>
          {form.rewardType === "FREE_ITEM" ? (
            <Field
              label="Free item"
              hint="Added free to their next order while it's in stock."
              error={errors.freeVariantId}
            >
              <AdminSelect
                value={form.freeVariantId}
                onChange={(e) => set("freeVariantId", e.target.value)}
              >
                <option value="">Pick an item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.stock} in stock)
                  </option>
                ))}
              </AdminSelect>
            </Field>
          ) : (
            <Field
              label={
                form.rewardType === "AMOUNT_OFF"
                  ? "Amount off (₹)"
                  : "Percent off"
              }
              error={errors.value}
            >
              <AdminInput
                type="number"
                min={1}
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
              />
            </Field>
          )}
          <Field
            label="Code lasts (days)"
            hint="Counted from the day it's given."
            error={errors.validDays}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.validDays}
              onChange={(e) => set("validDays", e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            Switched on
          </label>
          <div className="flex gap-2">
            <AdminButton type="button" disabled={busy} onClick={save}>
              {busy ? "Saving..." : "Save reward"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </AdminButton>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
