"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminTextarea,
  Field,
  useToast,
} from "./ui";

export interface StoreSettingsValues {
  freeShippingThreshold: number;
  deliveryFee: number;
  codEnabled: boolean;
  codFee: number;
  codMinOrder: number | null;
  codMaxOrder: number | null;
  paymentHoldMinutes: number;
  returnWindowDays: number;
  returnsAllowRefund: boolean;
  returnsAllowExchange: boolean;
  returnSaleItems: boolean;
  returnReasons: string[];
  returnConditionNote: string;
  returnShippingNote: string;
}

const numberOrNull = (value: string) =>
  value.trim() === "" ? null : Number(value);

/** Delivery fee, cash on delivery and return rules. Money in rupees. */
export function StoreSettingsForm({
  initial,
  canManage,
}: {
  initial: StoreSettingsValues;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [reasonsText, setReasonsText] = useState(
    initial.returnReasons.join("\n"),
  );
  const [baseline, setBaseline] = useState(
    JSON.stringify({
      ...initial,
      reasonsText: initial.returnReasons.join("\n"),
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify({ ...values, reasonsText }) !== baseline;

  function set<K extends keyof StoreSettingsValues>(
    key: K,
    value: StoreSettingsValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...values,
      returnReasons: reasonsText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    const response = await fetch("/api/settings/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;
    setSaving(false);
    if (!data?.ok) {
      setError(data?.error ?? "That didn't save. Try again.");
      return;
    }
    setBaseline(JSON.stringify({ ...values, reasonsText }));
    toast("Shop rules saved.", "success");
    router.refresh();
  }

  const disabled = !canManage;
  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">Delivery</h2>
          <p className="text-sm text-onwei-blue/70">
            Orders at or above the free delivery amount (after discounts) ship
            free. Below it, the delivery fee is added. Every place on the site
            that mentions free delivery uses this number.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Free delivery from (₹)">
            <AdminInput
              type="number"
              min={0}
              step="1"
              disabled={disabled}
              value={values.freeShippingThreshold}
              onChange={(e) =>
                set("freeShippingThreshold", Number(e.target.value))
              }
            />
          </Field>
          <Field label="Delivery fee below that (₹)">
            <AdminInput
              type="number"
              min={0}
              step="1"
              disabled={disabled}
              value={values.deliveryFee}
              onChange={(e) => set("deliveryFee", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field
          label="Hold items while paying (minutes)"
          hint="How long stock and coupon uses are kept for someone in the payment window. After that, unpaid orders are cancelled and the items go back on sale."
        >
          <AdminInput
            type="number"
            min={5}
            max={60}
            disabled={disabled}
            value={values.paymentHoldMinutes}
            onChange={(e) => set("paymentHoldMinutes", Number(e.target.value))}
            className="w-40"
          />
        </Field>
      </AdminCard>

      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Cash on delivery
          </h2>
          <p className="text-sm text-onwei-blue/70">
            Customers still sign in with a code before ordering. Coupons can be
            set to online payment only.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={disabled}
            checked={values.codEnabled}
            onChange={(e) => set("codEnabled", e.target.checked)}
          />
          Offer cash on delivery
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Cash on delivery fee (₹)" hint="0 for no fee.">
            <AdminInput
              type="number"
              min={0}
              disabled={disabled || !values.codEnabled}
              value={values.codFee}
              onChange={(e) => set("codFee", Number(e.target.value))}
            />
          </Field>
          <Field label="Smallest order (₹)" hint="Leave empty for no minimum.">
            <AdminInput
              type="number"
              min={0}
              disabled={disabled || !values.codEnabled}
              value={values.codMinOrder ?? ""}
              onChange={(e) => set("codMinOrder", numberOrNull(e.target.value))}
            />
          </Field>
          <Field label="Largest order (₹)" hint="Leave empty for no maximum.">
            <AdminInput
              type="number"
              min={0}
              disabled={disabled || !values.codEnabled}
              value={values.codMaxOrder ?? ""}
              onChange={(e) => set("codMaxOrder", numberOrNull(e.target.value))}
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">Returns</h2>
          <p className="text-sm text-onwei-blue/70">
            Customers ask for a return from their order page while the window is
            open. You can also switch returns off for a category or a product on
            its own page.
          </p>
        </div>
        <Field
          label="Return window (days after delivery)"
          hint="0 switches customer returns off."
        >
          <AdminInput
            type="number"
            min={0}
            max={90}
            disabled={disabled}
            value={values.returnWindowDays}
            onChange={(e) => set("returnWindowDays", Number(e.target.value))}
            className="w-40"
          />
        </Field>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={disabled}
              checked={values.returnsAllowRefund}
              onChange={(e) => set("returnsAllowRefund", e.target.checked)}
            />
            Customers can ask for their money back
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={disabled}
              checked={values.returnsAllowExchange}
              onChange={(e) => set("returnsAllowExchange", e.target.checked)}
            />
            Customers can ask for a different size or colour
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={disabled}
              checked={values.returnSaleItems}
              onChange={(e) => set("returnSaleItems", e.target.checked)}
            />
            Items bought on sale can be returned
          </label>
        </div>
        <Field label="Reasons customers pick from" hint="One per line.">
          <AdminTextarea
            rows={5}
            disabled={disabled}
            value={reasonsText}
            onChange={(e) => setReasonsText(e.target.value)}
          />
        </Field>
        <Field
          label="Condition the item must be in"
          hint="Shown on the return form."
        >
          <AdminInput
            disabled={disabled}
            value={values.returnConditionNote}
            onChange={(e) => set("returnConditionNote", e.target.value)}
          />
        </Field>
        <Field
          label="How it comes back to us"
          hint="Shown on the return form, e.g. pickup or send it yourself."
        >
          <AdminInput
            disabled={disabled}
            value={values.returnShippingNote}
            onChange={(e) => set("returnShippingNote", e.target.value)}
          />
        </Field>
      </AdminCard>

      {error ? (
        <p role="alert" className="text-sm text-onwei-black">
          {error}
        </p>
      ) : null}
      {canManage ? (
        <div>
          <AdminButton type="submit" disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save shop rules"}
          </AdminButton>
        </div>
      ) : (
        <p className="text-sm text-onwei-blue/70">
          Ask someone who can manage settings to change these.
        </p>
      )}
    </form>
  );
}
