"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminInput,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminTextarea,
} from "./ui";

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  isPublished: boolean;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Backs the homepage's "From the Playbook" section and /journal/[slug],
// same add/remove shape as ValuePropsEditor, plus a publish toggle since
// draft-vs-live is the one thing this content type actually needs mid-life
// editing for (ValueProp/Instagram/marquee rows are either live or gone).
export function ArticlesEditor({ items }: { items: ArticleRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    slugTouched: false,
    excerpt: "",
    bodyHtml: "",
    coverImageUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleTitleChange(value: string) {
    setForm((f) => ({
      ...f,
      title: value,
      slug: f.slugTouched ? f.slug : slugify(value),
    }));
  }

  async function add() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/content/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt || null,
          bodyHtml: form.bodyHtml,
          coverImageUrl: form.coverImageUrl || null,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Couldn't add that article.");
        return;
      }
      setForm({
        title: "",
        slug: "",
        slugTouched: false,
        excerpt: "",
        bodyHtml: "",
        coverImageUrl: "",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublished(item: ArticleRow) {
    setSubmitting(true);
    await fetch(`/api/content/articles/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    setSubmitting(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this article? This can't be undone.")) {
      return;
    }
    setSubmitting(true);
    await fetch(`/api/content/articles/${id}`, { method: "DELETE" });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Title</AdminTableHeaderCell>
            <AdminTableHeaderCell>Slug</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>{item.title}</AdminTableCell>
                <AdminTableCell className="font-mono text-xs">
                  /journal/{item.slug}
                </AdminTableCell>
                <AdminTableCell>
                  {item.isPublished ? "Published" : "Draft"}
                </AdminTableCell>
                <AdminTableCell className="flex gap-2">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => togglePublished(item)}
                  >
                    {item.isPublished ? "Unpublish" : "Publish"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="danger"
                    disabled={submitting}
                    onClick={() => remove(item.id)}
                  >
                    Remove
                  </AdminButton>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <p className="text-sm text-onwei-blue/70">No articles yet.</p>
      )}

      <div className="flex flex-col gap-3 sm:max-w-xl">
        <AdminInput
          placeholder="Title"
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <AdminInput
          placeholder="URL slug"
          value={form.slug}
          onChange={(e) =>
            setForm((f) => ({ ...f, slug: e.target.value, slugTouched: true }))
          }
          className="font-mono"
        />
        <AdminInput
          placeholder="Cover image URL"
          value={form.coverImageUrl}
          onChange={(e) =>
            setForm((f) => ({ ...f, coverImageUrl: e.target.value }))
          }
        />
        <AdminTextarea
          placeholder="Excerpt (shown on the homepage card)"
          rows={2}
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
        />
        <AdminTextarea
          placeholder="Body (HTML)"
          rows={8}
          value={form.bodyHtml}
          onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
        />
        <AdminButton
          type="button"
          disabled={submitting || !form.title.trim() || !form.slug.trim()}
          onClick={add}
          className="w-fit"
        >
          Add article (as a draft)
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
