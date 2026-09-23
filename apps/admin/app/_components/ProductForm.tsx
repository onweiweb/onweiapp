"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft — hidden from the storefront" },
  { value: "ACTIVE", label: "Live — visible on the storefront" },
  { value: "ARCHIVED", label: "Discontinued — hidden from the storefront" },
] as const;

interface ProductSpecRow {
  label: string;
  value: string;
}

export function ProductForm({
  mode,
  productId,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  productId?: string;
  categories: { id: string; name: string }[];
  initial?: {
    name: string;
    slug: string;
    categoryId: string;
    description: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    specs?: ProductSpecRow[];
    whoThisIsFor?: string;
    careInstructions?: string;
    powerRating?: string;
    spinRating?: string;
    controlRating?: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [specs, setSpecs] = useState<ProductSpecRow[]>(initial?.specs ?? []);
  const [whoThisIsFor, setWhoThisIsFor] = useState(initial?.whoThisIsFor ?? "");
  const [careInstructions, setCareInstructions] = useState(
    initial?.careInstructions ?? "",
  );
  const [powerRating, setPowerRating] = useState(initial?.powerRating ?? "");
  const [spinRating, setSpinRating] = useState(initial?.spinRating ?? "");
  const [controlRating, setControlRating] = useState(
    initial?.controlRating ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateSpecRow(
    index: number,
    field: "label" | "value",
    value: string,
  ) {
    setSpecs((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function removeSpecRow(index: number) {
    setSpecs((rows) => rows.filter((_, i) => i !== index));
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const url =
      mode === "create" ? "/api/products" : `/api/products/${productId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          categoryId,
          description,
          status,
          specs: specs.filter((row) => row.label.trim() && row.value.trim()),
          whoThisIsFor: whoThisIsFor.trim() || null,
          careInstructions: careInstructions.trim() || null,
          powerRating: powerRating === "" ? null : Number(powerRating),
          spinRating: spinRating === "" ? null : Number(spinRating),
          controlRating: controlRating === "" ? null : Number(controlRating),
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        product?: { id: string };
      };

      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      if (mode === "create" && data.product) {
        router.push(`/products/${data.product.id}`);
      } else {
        router.push("/products");
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          required
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium">
          URL slug
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          className="rounded-md border border-neutral-300 px-3 py-2"
        >
          {categories.length === 0 ? (
            <option value="">Add a category first</option>
          ) : null}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <p className="text-sm font-medium">Product page details (optional)</p>
        <p className="text-xs text-neutral-500">
          Shown on the product&apos;s storefront page. Leave blank to hide a
          section — nothing shows a placeholder.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Specs</label>
        {specs.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={row.label}
              onChange={(event) =>
                updateSpecRow(index, "label", event.target.value)
              }
              placeholder="Label (e.g. Material)"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              value={row.value}
              onChange={(event) =>
                updateSpecRow(index, "value", event.target.value)
              }
              placeholder="Value"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeSpecRow(index)}
              className="rounded-md border border-neutral-300 px-2 text-sm text-neutral-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSpecs((rows) => [...rows, { label: "", value: "" }])
          }
          className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
        >
          Add spec row
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="whoThisIsFor" className="text-sm font-medium">
          Who this is for
        </label>
        <textarea
          id="whoThisIsFor"
          value={whoThisIsFor}
          onChange={(event) => setWhoThisIsFor(event.target.value)}
          rows={4}
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="careInstructions" className="text-sm font-medium">
          Care instructions
        </label>
        <textarea
          id="careInstructions"
          value={careInstructions}
          onChange={(event) => setCareInstructions(event.target.value)}
          rows={4}
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Play characteristics (0-100, paddle products only)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={powerRating}
            onChange={(event) => setPowerRating(event.target.value)}
            placeholder="Power"
            className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={spinRating}
            onChange={(event) => setSpinRating(event.target.value)}
            placeholder="Spin"
            className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={controlRating}
            onChange={(event) => setControlRating(event.target.value)}
            placeholder="Control"
            className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="rounded-md border border-neutral-300 px-3 py-2"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || categories.length === 0}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create product"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
