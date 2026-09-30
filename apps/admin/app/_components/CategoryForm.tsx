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

      router.push("/categories");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
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
        <p className="text-xs text-neutral-500">
          This is the web address for the category, e.g. /collection/
          {slug || "your-slug"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sortOrder" className="text-sm font-medium">
          Display order
        </label>
        <input
          id="sortOrder"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
          className="w-24 rounded-md border border-neutral-300 px-3 py-2"
        />
        <p className="text-xs text-neutral-500">
          Lower numbers show first on the storefront.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Visible on site
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="metaTitle" className="text-sm font-medium">
          Search result title
        </label>
        <input
          id="metaTitle"
          value={metaTitle}
          onChange={(event) => setMetaTitle(event.target.value)}
          placeholder={name ? `${name} | Onwei` : undefined}
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
        <p className="text-xs text-neutral-500">
          Controls how this category shows up in Google search results. Leave
          blank and we&apos;ll build one from the name above.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="metaDescription" className="text-sm font-medium">
          Search result description
        </label>
        <textarea
          id="metaDescription"
          value={metaDescription}
          onChange={(event) => setMetaDescription(event.target.value)}
          rows={3}
          placeholder="Shown under the title in Google's results, a sentence or two about this category."
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create category"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
