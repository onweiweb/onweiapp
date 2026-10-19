"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminInput,
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

export function CategoryForm({
  mode,
  categoryId,
  initial,
}: {
  mode: "create" | "edit";
  categoryId?: string;
  initial?: {
    name: string;
    slug: string;
    isActive: boolean;
    sortOrder: number;
    metaTitle?: string;
    metaDescription?: string;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial?.metaDescription ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = JSON.stringify([
    name,
    slug,
    isActive,
    sortOrder,
    metaTitle.trim(),
    metaDescription.trim(),
  ]);
  const [baseline, setBaseline] = useState(current);
  const dirty = mode === "create" || current !== baseline;

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const url =
      mode === "create" ? "/api/categories" : `/api/categories/${categoryId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          isActive,
          sortOrder,
          metaTitle: metaTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setBaseline(current);
      toast(mode === "create" ? "Category created." : "Changes saved.");
      router.push("/categories");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <AdminCard className="flex flex-col gap-4 !rounded-[20px]">
        <p className="font-display text-sm font-semibold uppercase">Details</p>
        <Field label="Name">
          <AdminInput
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            required
          />
        </Field>
        <Field
          label="Page address"
          hint={`Shoppers will see /collection/${slug || "your-address"}`}
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
          label="Search result title"
          hint="How this category looks in Google. Leave blank and we will build one from the name."
        >
          <AdminInput
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            placeholder={name ? `${name} | Onwei` : undefined}
          />
        </Field>
        <Field
          label="Search result description"
          hint="A sentence or two shown under the title in Google."
        >
          <AdminTextarea
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            rows={3}
          />
        </Field>
      </AdminCard>

      <AdminCard className="flex flex-col gap-4 self-start !rounded-[20px]">
        <p className="font-display text-sm font-semibold uppercase">Display</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Visible on site
        </label>
        <Field
          label="Display order"
          hint="Lower numbers show first on the storefront."
        >
          <AdminInput
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
            className="w-28"
          />
        </Field>
        {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
        <div className="flex gap-2 border-t border-onwei-blue/10 pt-4">
          <AdminButton type="submit" disabled={submitting || !dirty}>
            {submitting
              ? "Saving..."
              : mode === "create"
                ? "Create category"
                : "Save changes"}
          </AdminButton>
          <LinkButton href="/categories" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </AdminCard>
    </form>
  );
}
