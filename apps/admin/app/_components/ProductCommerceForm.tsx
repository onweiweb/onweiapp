"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  Field,
  useToast,
} from "./ui";

const GST_RATES = ["", "0", "5", "12", "18", "28"];

/** Returns and tax for one product. Prices on the site already include GST. */
export function ProductCommerceForm({
  productId,
  initial,
  categoryReturnable,
}: {
  productId: string;
  initial: { isReturnable: boolean; hsnCode: string; gstRate: string };
  categoryReturnable: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        const response = await fetch(`/api/products/${productId}/commerce`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isReturnable: values.isReturnable,
            hsnCode: values.hsnCode.trim() || null,
            gstRate: values.gstRate === "" ? null : Number(values.gstRate),
          }),
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
        setBaseline(JSON.stringify(values));
        toast("Saved.", "success");
        router.refresh();
      }}
    >
      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">Returns</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isReturnable}
            onChange={(e) =>
              setValues((v) => ({ ...v, isReturnable: e.target.checked }))
            }
          />
          Customers can return this product
        </label>
        {!categoryReturnable ? (
          <p className="text-sm text-onwei-blue/70">
            Its category is set to no returns, so this product can&apos;t be
            returned either way.
          </p>
        ) : null}
        <p className="text-xs text-onwei-blue/60">
          The return window and reasons are in Settings, Delivery, payment and
          returns.
        </p>
      </AdminCard>
      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">Tax (GST)</h2>
        <p className="text-sm text-onwei-blue/70">
          Prices already include GST. These are used to show the GST part on
          each order for invoices.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="HSN code" hint="4 to 8 digits, from your accountant.">
            <AdminInput
              value={values.hsnCode}
              onChange={(e) =>
                setValues((v) => ({ ...v, hsnCode: e.target.value }))
              }
              inputMode="numeric"
            />
          </Field>
          <Field
            label="GST rate (%)"
            hint="Leave empty if you're not sure yet."
          >
            <AdminSelect
              value={values.gstRate}
              onChange={(e) =>
                setValues((v) => ({ ...v, gstRate: e.target.value }))
              }
            >
              {GST_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate === "" ? "Not set" : `${rate}%`}
                </option>
              ))}
            </AdminSelect>
          </Field>
        </div>
      </AdminCard>
      {error ? (
        <p role="alert" className="text-sm text-onwei-black">
          {error}
        </p>
      ) : null}
      <div>
        <AdminButton type="submit" disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save"}
        </AdminButton>
      </div>
    </form>
  );
}

export function CategoryReturnableToggle({
  categoryId,
  initial,
}: {
  categoryId: string;
  initial: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <AdminCard className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-onwei-blue">Returns</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value}
          disabled={busy}
          onChange={async (e) => {
            const next = e.target.checked;
            setBusy(true);
            const response = await fetch(
              `/api/categories/${categoryId}/returnable`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isReturnable: next }),
              },
            ).catch(() => null);
            setBusy(false);
            if (!response?.ok)
              return toast("That didn't save. Try again.", "error");
            setValue(next);
            toast(
              next
                ? "Products in this category can be returned."
                : "Products in this category can't be returned.",
              "success",
            );
            router.refresh();
          }}
        />
        Products in this category can be returned
      </label>
      <p className="text-xs text-onwei-blue/60">
        Switch off for things like socks or innerwear. Orders already placed
        keep the rule they were bought under.
      </p>
    </AdminCard>
  );
}
