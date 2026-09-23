"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminInput, AdminSelect, AdminStepper, AdminTextarea } from "./ui";
import type { AdminStepItem } from "./ui";

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
        router.push(`/products/${data.product.id}?tab=photos`);
      } else {
        router.push("/products");
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const basicsComplete = Boolean(name.trim() && slug.trim() && categoryId);

  const steps: AdminStepItem[] = [
    {
      id: "basics",
      label: "Basics",
      canAdvance: basicsComplete,
      content: (
        <div className="flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <AdminInput
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            URL slug
            <AdminInput
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              required
              className="font-mono"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Category
            <AdminSelect
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              {categories.length === 0 ? (
                <option value="">Add a category first</option>
              ) : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <AdminSelect
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
        </div>
      ),
    },
    {
      id: "storefront",
      label: "Storefront content",
      content: (
        <div className="flex max-w-xl flex-col gap-4">
          <p className="text-xs text-onwei-blue/60">
            Shown on the product&apos;s storefront page. Leave blank to hide a
            section — nothing shows a placeholder.
          </p>

          <label className="flex flex-col gap-1 text-sm">
            Description
            <AdminTextarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </label>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Specs</label>
            {specs.map((row, index) => (
              <div key={index} className="flex gap-2">
                <AdminInput
                  value={row.label}
                  onChange={(event) =>
                    updateSpecRow(index, "label", event.target.value)
                  }
                  placeholder="Label (e.g. Material)"
                  className="flex-1"
                />
                <AdminInput
                  value={row.value}
                  onChange={(event) =>
                    updateSpecRow(index, "value", event.target.value)
                  }
                  placeholder="Value"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(index)}
                  className="rounded-[500px] border border-onwei-blue/25 px-3 text-sm text-onwei-blue/70"
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
              className="w-fit rounded-[500px] border border-onwei-blue/25 px-3 py-1.5 text-sm text-onwei-blue"
            >
              Add spec row
            </button>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Who this is for
            <AdminTextarea
              value={whoThisIsFor}
              onChange={(event) => setWhoThisIsFor(event.target.value)}
              rows={4}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Care instructions
            <AdminTextarea
              value={careInstructions}
              onChange={(event) => setCareInstructions(event.target.value)}
              rows={4}
            />
          </label>
        </div>
      ),
    },
    {
      id: "play-characteristics",
      label: "Play characteristics",
      content: (
        <div className="flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Play characteristics (0-100, paddle products only)
            <div className="flex gap-2">
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={powerRating}
                onChange={(event) => setPowerRating(event.target.value)}
                placeholder="Power"
                className="w-24"
              />
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={spinRating}
                onChange={(event) => setSpinRating(event.target.value)}
                placeholder="Spin"
                className="w-24"
              />
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={controlRating}
                onChange={(event) => setControlRating(event.target.value)}
                placeholder="Control"
                className="w-24"
              />
            </div>
          </label>
        </div>
      ),
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      <AdminStepper
        steps={steps}
        submitLabel={
          submitting
            ? "Saving…"
            : mode === "create"
              ? "Create product"
              : "Save changes"
        }
        submitDisabled={submitting || categories.length === 0}
      />
    </form>
  );
}
