"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminCard, AdminInput, Field, useToast } from "./ui";

interface BoxValues {
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightGrams: string;
}

const toNumber = (value: string) =>
  value.trim() === "" ? null : Number(value);

/** The shipper box every product in a category goes in, for the courier. */
export function CategoryShipperBoxForm({
  categoryId,
  initial,
}: {
  categoryId: string;
  initial: BoxValues;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;
  const set =
    (key: keyof BoxValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <AdminCard className="flex max-w-2xl flex-col gap-3">
      <h2 className="text-lg font-semibold text-onwei-blue">Shipper box</h2>
      <p className="text-sm text-onwei-blue/70">
        The cardboard box every product in this category is packed in. Each item
        in an order gets its own box, stacked: the parcel sent to iThink is the
        longest box, the widest box and all the box heights added up. Until
        it&apos;s filled in, orders use the backup size in Settings.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError(null);
          const response = await fetch(`/api/categories/${categoryId}/box`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lengthCm: toNumber(values.lengthCm),
              widthCm: toNumber(values.widthCm),
              heightCm: toNumber(values.heightCm),
              weightGrams: toNumber(values.weightGrams),
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
          toast("Shipper box saved.", "success");
          router.refresh();
        }}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Length (cm)">
            <AdminInput
              type="number"
              min="0.5"
              step="0.1"
              value={values.lengthCm}
              onChange={set("lengthCm")}
            />
          </Field>
          <Field label="Width (cm)">
            <AdminInput
              type="number"
              min="0.5"
              step="0.1"
              value={values.widthCm}
              onChange={set("widthCm")}
            />
          </Field>
          <Field label="Height (cm)">
            <AdminInput
              type="number"
              min="0.5"
              step="0.1"
              value={values.heightCm}
              onChange={set("heightCm")}
            />
          </Field>
          <Field label="Empty box weight (g)">
            <AdminInput
              type="number"
              min="0"
              step="1"
              value={values.weightGrams}
              onChange={set("weightGrams")}
            />
          </Field>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-onwei-black">
            {error}
          </p>
        ) : null}
        <div>
          <AdminButton type="submit" disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save box"}
          </AdminButton>
        </div>
      </form>
    </AdminCard>
  );
}
