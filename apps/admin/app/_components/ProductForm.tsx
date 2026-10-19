"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  Field,
  LinkButton,
  useToast,
} from "./ui";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft, hidden from the storefront" },
  { value: "ACTIVE", label: "Live, visible on the storefront" },
  { value: "ARCHIVED", label: "Discontinued, hidden from the storefront" },
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
    metaTitle?: string;
    metaDescription?: string;
  };
}) {
  const router = useRouter();
  const toast = useToast();
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
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial?.metaDescription ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const current = JSON.stringify([
    name,
    slug,
    categoryId,
    description,
    status,
    specs,
    whoThisIsFor,
    careInstructions,
    powerRating,
    spinRating,
    controlRating,
    metaTitle,
    metaDescription,
  ]);
  const [baseline, setBaseline] = useState(current);
  const dirty = mode === "create" || current !== baseline;

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
          metaTitle: metaTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
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
        // Stay on the product so staff can keep working, Save turns off
        // again until the next change.
        setBaseline(current);
        setSubmitting(false);
        toast("Changes saved.");
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const canSave =
    !submitting &&
    categories.length > 0 &&
    Boolean(name.trim() && slug.trim() && categoryId) &&
    dirty;

  const sectionTitle = "font-display text-sm font-semibold uppercase";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <AdminCard className="flex flex-col gap-4 !rounded-[20px]">
          <p className={sectionTitle}>Basics</p>
          <Field label="Name">
            <AdminInput
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              required
            />
          </Field>
          <Field
            label="Page address"
            hint={`Shoppers will see /product/${slug || "your-address"}`}
          >
            <AdminInput
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              required
              className="font-mono"
            />
          </Field>
          <Field
            label="Description"
            hint="Shown on the product page. Leave blank to hide it."
          >
            <AdminTextarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </Field>
        </AdminCard>

        <AdminCard className="flex flex-col gap-4 !rounded-[20px]">
          <p className={sectionTitle}>Product page content</p>
          <p className="-mt-2 text-xs text-onwei-blue/70">
            Each section only shows on the product page when it has text.
          </p>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Specs</span>
            {specs.length === 0 ? (
              <p className="text-xs text-onwei-blue/70">
                No specs yet, like Material or Weight.
              </p>
            ) : null}
            {specs.map((row, index) => (
              <div key={index} className="flex gap-2">
                <AdminInput
                  value={row.label}
                  onChange={(event) =>
                    updateSpecRow(index, "label", event.target.value)
                  }
                  placeholder="Label (e.g. Material)"
                  aria-label="Spec label"
                  className="min-w-0 flex-1"
                />
                <AdminInput
                  value={row.value}
                  onChange={(event) =>
                    updateSpecRow(index, "value", event.target.value)
                  }
                  placeholder="Value"
                  aria-label="Spec value"
                  className="min-w-0 flex-1"
                />
                <AdminButton
                  type="button"
                  variant="secondary"
                  onClick={() => removeSpecRow(index)}
                  className="!px-4"
                >
                  Remove
                </AdminButton>
              </div>
            ))}
            <AdminButton
              type="button"
              variant="secondary"
              className="w-fit !py-1 text-xs"
              onClick={() =>
                setSpecs((rows) => [...rows, { label: "", value: "" }])
              }
            >
              + Add a spec
            </AdminButton>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Who this is for">
              <AdminTextarea
                value={whoThisIsFor}
                onChange={(event) => setWhoThisIsFor(event.target.value)}
                rows={4}
              />
            </Field>
            <Field label="Care instructions">
              <AdminTextarea
                value={careInstructions}
                onChange={(event) => setCareInstructions(event.target.value)}
                rows={4}
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col gap-4 !rounded-[20px]">
          <p className={sectionTitle}>Play characteristics</p>
          <p className="-mt-2 text-xs text-onwei-blue/70">
            Scores from 0 to 100. Only for paddle products, leave blank for
            anything else.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <Field label="Power">
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={powerRating}
                onChange={(event) => setPowerRating(event.target.value)}
              />
            </Field>
            <Field label="Spin">
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={spinRating}
                onChange={(event) => setSpinRating(event.target.value)}
              />
            </Field>
            <Field label="Control">
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={controlRating}
                onChange={(event) => setControlRating(event.target.value)}
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col gap-4 !rounded-[20px]">
          <p className={sectionTitle}>Search listing</p>
          <p className="-mt-2 text-xs text-onwei-blue/70">
            How this product looks in Google. Leave blank and we build one from
            the name and description.
          </p>
          <Field label="Search result title">
            <AdminInput
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
              placeholder={name ? `${name} | Onwei` : undefined}
            />
          </Field>
          <Field label="Search result description">
            <AdminTextarea
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
              rows={3}
              placeholder="A sentence or two about the product."
            />
          </Field>
        </AdminCard>
      </div>

      <div className="flex flex-col gap-5 xl:sticky xl:top-5">
        <AdminCard className="flex flex-col gap-4 !rounded-[20px]">
          <p className={sectionTitle}>Publishing</p>
          <Field label="Status">
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
          </Field>
          <Field label="Category">
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
          </Field>
          {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
          <div className="flex flex-col gap-2 border-t border-onwei-blue/10 pt-4">
            <AdminButton type="submit" disabled={!canSave}>
              {submitting
                ? "Saving..."
                : mode === "create"
                  ? "Create product"
                  : "Save changes"}
            </AdminButton>
            <LinkButton href="/products" variant="secondary">
              Cancel
            </LinkButton>
            {mode === "create" ? (
              <p className="text-xs text-onwei-blue/70">
                Next you can add photos and variants.
              </p>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </form>
  );
}
