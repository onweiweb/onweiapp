"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Variant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: string;
  status: string;
}

export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const router = useRouter();
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
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleStatusChange(variantId: string, status: string) {
    await fetch(`/api/products/${productId}/variants/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length === 0 ? (
        <p className="text-sm text-neutral-600">
          No variants yet — this product won&apos;t be purchasable on the
          storefront until it has at least one.
        </p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Attributes</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className="border-b border-neutral-100">
                <td className="px-3 py-2 font-mono">{variant.sku}</td>
                <td className="px-3 py-2">
                  {Object.entries(variant.attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ") || "—"}
                </td>
                <td className="px-3 py-2">₹{variant.price}</td>
                <td className="px-3 py-2">
                  <select
                    value={variant.status}
                    onChange={(event) =>
                      handleStatusChange(variant.id, event.target.value)
                    }
                    className="rounded-md border border-neutral-300 px-2 py-1"
                  >
                    <option value="ACTIVE">Live</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Discontinued</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form
        onSubmit={handleAddVariant}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="variant-sku" className="text-xs font-medium">
            SKU
          </label>
          <input
            id="variant-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
            className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="variant-size" className="text-xs font-medium">
            Size
          </label>
          <input
            id="variant-size"
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="variant-color" className="text-xs font-medium">
            Color
          </label>
          <input
            id="variant-color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="variant-price" className="text-xs font-medium">
            Price (₹)
          </label>
          <input
            id="variant-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
            className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add variant"}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
