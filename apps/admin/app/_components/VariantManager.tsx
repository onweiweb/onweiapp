"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  Field,
  useToast,
} from "./ui";

interface Variant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  // Pre-formatted server-side (formatCurrency, @onwei/core) rather than
  // formatted here -- @onwei/core's package.json has no subpath exports, so
  // any import from it (even a pure formatting helper) pulls its whole
  // barrel in, including Prisma-touching modules that can't resolve in a
  // client bundle. A Server Component doing the formatting and passing the
  // string down avoids that entirely.
  priceFormatted: string;
  status: string;
  weightGrams: number | null;
}

/** Saves a variant's weight when the box loses focus with a new value. */
function WeightCell({
  productId,
  variant,
}: {
  productId: string;
  variant: Variant;
}) {
  const router = useRouter();
  const toast = useToast();
  const saved = variant.weightGrams?.toString() ?? "";
  const [value, setValue] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (value.trim() === saved) return;
    setBusy(true);
    const response = await fetch(
      `/api/products/${productId}/variants/${variant.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightGrams: value.trim() === "" ? null : Number(value),
        }),
      },
    ).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;
    setBusy(false);
    if (!data?.ok) {
      toast(data?.error ?? "That didn't save. Try again.", "error");
      setValue(saved);
      return;
    }
    toast(`Weight saved for ${variant.sku}.`, "success");
    router.refresh();
  }

  return (
    <AdminInput
      type="number"
      min="1"
      step="1"
      value={value}
      disabled={busy}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      placeholder="Add weight"
      aria-label={`Weight in grams for ${variant.sku}`}
      className={`!h-9 w-28 ${saved === "" ? "!border-onwei-black" : ""}`}
    />
  );
}

export function VariantManager({
  productId,
  variants,
  boxText,
  categoryHref,
}: {
  productId: string;
  variants: Variant[];
  /** "Packed in the Pickleball box, 45 x 25 x 5 cm" or null if not set. */
  boxText: string | null;
  categoryHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [weight, setWeight] = useState("");
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAddVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const attributes: Record<string, string> = {};
    if (size) attributes.size = size;
    if (color) attributes.color = color;

    try {
      const response = await fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          attributes,
          price: Number(price),
          weightGrams: weight.trim() === "" ? null : Number(weight),
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSku("");
      setSize("");
      setColor("");
      setPrice("");
      setWeight("");
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleStatusChange(variantId: string, status: string) {
    const response = await fetch(
      `/api/products/${productId}/variants/${variantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      error?: string;
    } | null;
    if (!data?.ok)
      toast(data?.error ?? "That didn't save. Try again.", "error");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-onwei-blue/70">
        {boxText ? (
          <>
            {boxText}. Give each size its packed weight in grams (without the
            box). A size with no weight is sent with the backup weight from
            Settings.{" "}
            <Link href={categoryHref} className="underline">
              Change the box
            </Link>
          </>
        ) : (
          <>
            This product&apos;s category has no shipper box yet, so orders use
            the backup size from Settings.{" "}
            <Link href={categoryHref} className="underline">
              Add the box
            </Link>
          </>
        )}
      </p>
      {variants.length === 0 ? (
        <EmptyState
          title="No variants yet"
          description="This product won't be purchasable on the storefront until it has at least one."
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>SKU</AdminTableHeaderCell>
            <AdminTableHeaderCell>Attributes</AdminTableHeaderCell>
            <AdminTableHeaderCell>Price</AdminTableHeaderCell>
            <AdminTableHeaderCell>Weight (g)</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {variants.map((variant) => (
              <AdminTableRow key={variant.id}>
                <AdminTableCell className="font-mono text-xs">
                  {variant.sku}
                </AdminTableCell>
                <AdminTableCell>
                  {Object.entries(variant.attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ") || "-"}
                </AdminTableCell>
                <AdminTableCell>{variant.priceFormatted}</AdminTableCell>
                <AdminTableCell>
                  <WeightCell productId={productId} variant={variant} />
                </AdminTableCell>
                <AdminTableCell>
                  <AdminSelect
                    value={variant.status}
                    onChange={(event) =>
                      handleStatusChange(variant.id, event.target.value)
                    }
                    aria-label={`Status for ${variant.sku}`}
                    className="!h-9"
                  >
                    <option value="ACTIVE">Live</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Discontinued</option>
                  </AdminSelect>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}

      <form
        onSubmit={handleAddVariant}
        className="flex flex-wrap items-end gap-3 rounded-[20px] border border-onwei-blue/10 bg-onwei-white p-4"
      >
        <Field label="SKU" className="w-36">
          <AdminInput
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
            className="!h-9"
          />
        </Field>
        <Field label="Size" className="w-24">
          <AdminInput
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="!h-9"
          />
        </Field>
        <Field label="Color" className="w-28">
          <AdminInput
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="!h-9"
          />
        </Field>
        <Field label="Price (₹)" className="w-32">
          <AdminInput
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
            className="!h-9"
          />
        </Field>
        <Field label="Weight (g)" className="w-28">
          <AdminInput
            type="number"
            min="1"
            step="1"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="Optional"
            className="!h-9"
          />
        </Field>
        <AdminButton type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add variant"}
        </AdminButton>
      </form>
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
    </div>
  );
}
