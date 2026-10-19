"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminTextarea,
  useConfirm,
  useToast,
} from "./ui";

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  coverImageUrl: string | null;
  isPublished: boolean;
}

interface FormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  bodyHtml: string;
  coverImageUrl: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  bodyHtml: "",
  coverImageUrl: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Buttons that wrap the selected text in the matching HTML, so staff don't
// have to type tags by hand.
const TOOLS: { label: string; before: string; after: string }[] = [
  { label: "Heading", before: "<h2>", after: "</h2>" },
  { label: "Bold", before: "<strong>", after: "</strong>" },
  { label: "Italic", before: "<em>", after: "</em>" },
  { label: "Bullet list", before: "<ul>\n  <li>", after: "</li>\n</ul>" },
  { label: "Paragraph", before: "<p>", after: "</p>" },
];

// Backs the Blogs page (/journal), each post's own page, and the homepage's
// "From the Playbook" row. Add, edit, publish and remove.
export function ArticlesEditor({ items }: { items: ArticleRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [publishedOverride, setPublishedOverride] = useState<
    Record<string, boolean>
  >({});
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  function handleTitleChange(value: string) {
    setForm((f) => ({
      ...f,
      title: value,
      slug: f.slugTouched || editingId ? f.slug : slugify(value),
    }));
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  // Editing an existing post: Save stays off until something changes.
  const formKey = JSON.stringify([
    form.title,
    form.slug,
    form.excerpt,
    form.bodyHtml,
    form.coverImageUrl,
  ]);
  const [editBaseline, setEditBaseline] = useState("");
  const dirty = !editingId || formKey !== editBaseline;

  function startEdit(item: ArticleRow) {
    setOpen(true);
    setEditingId(item.id);
    setError(null);
    setEditBaseline(
      JSON.stringify([
        item.title,
        item.slug,
        item.excerpt ?? "",
        item.bodyHtml,
        item.coverImageUrl ?? "",
      ]),
    );
    setForm({
      title: item.title,
      slug: item.slug,
      slugTouched: true,
      excerpt: item.excerpt ?? "",
      bodyHtml: item.bodyHtml,
      coverImageUrl: item.coverImageUrl ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function applyTool(tool: (typeof TOOLS)[number]) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? form.bodyHtml.length;
    const end = el?.selectionEnd ?? form.bodyHtml.length;
    const selected = form.bodyHtml.slice(start, end);
    const next =
      form.bodyHtml.slice(0, start) +
      tool.before +
      selected +
      tool.after +
      form.bodyHtml.slice(end);
    setForm((f) => ({ ...f, bodyHtml: next }));
  }

  function addLink() {
    const url = window.prompt("Where should the link go? (https://...)");
    if (!url) return;
    applyTool({ label: "Link", before: `<a href="${url}">`, after: "</a>" });
  }

  async function uploadCover(file: File) {
    setError(null);
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/content/articles/cover", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
      };
      if (!result.ok || !result.url) {
        setError(result.error ?? "Couldn't upload that image.");
        return;
      }
      setForm((f) => ({ ...f, coverImageUrl: result.url! }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        bodyHtml: form.bodyHtml,
        coverImageUrl: form.coverImageUrl || null,
      };
      const response = await fetch(
        editingId
          ? `/api/content/articles/${editingId}`
          : "/api/content/articles",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Couldn't save that post.");
        return;
      }
      cancelEdit();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublished(item: ArticleRow) {
    const next = !item.isPublished;
    // Show the new status straight away, then confirm with the server.
    setPublishedOverride((o) => ({ ...o, [item.id]: next }));
    const response = await fetch(`/api/content/articles/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: next }),
    }).catch(() => null);
    if (!response?.ok) {
      setPublishedOverride((o) => ({ ...o, [item.id]: item.isPublished }));
      toast("Couldn't change that post. Please try again.", "error");
      return;
    }
    toast(next ? "Post published." : "Post moved back to drafts.");
    router.refresh();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Delete this post?",
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    await fetch(`/api/content/articles/${id}`, { method: "DELETE" });
    setSubmitting(false);
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-onwei-blue/70">
          {items.length === 0
            ? "No posts yet."
            : `${items.length} ${items.length === 1 ? "post" : "posts"}`}
        </p>
        {!open ? (
          <AdminButton type="button" onClick={startNew}>
            + Write a new post
          </AdminButton>
        ) : null}
      </div>

      {open ? (
        <AdminCard className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-xl uppercase text-onwei-blue">
              {editingId ? "Edit post" : "New post"}
            </p>
            <AdminButton type="button" variant="secondary" onClick={cancelEdit}>
              Close
            </AdminButton>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-onwei-blue">
                  Title
                </span>
                <AdminInput
                  placeholder="e.g. 5 drills to improve your dink game"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-onwei-blue">
                  Page address
                </span>
                <AdminInput
                  placeholder="Filled in from the title"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value,
                      slugTouched: true,
                    }))
                  }
                  className="font-mono"
                />
                <span className="text-xs text-onwei-blue/70">
                  The post will live at /journal/{form.slug || "your-address"}
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-onwei-blue">
                  Short summary
                </span>
                <AdminTextarea
                  placeholder="One or two lines shown on the Blogs page and the homepage card"
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, excerpt: e.target.value }))
                  }
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-onwei-blue">
                  Post
                </span>
                <div className="flex flex-wrap gap-2">
                  {TOOLS.map((tool) => (
                    <AdminButton
                      key={tool.label}
                      type="button"
                      variant="secondary"
                      className="!px-3 !py-1 text-xs"
                      onClick={() => applyTool(tool)}
                    >
                      {tool.label}
                    </AdminButton>
                  ))}
                  <AdminButton
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1 text-xs"
                    onClick={addLink}
                  >
                    Link
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1 text-xs"
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    {showPreview ? "Hide preview" : "Preview"}
                  </AdminButton>
                </div>
                <AdminTextarea
                  ref={bodyRef}
                  placeholder="Write the post here. Select some text and use a button above to format it."
                  rows={14}
                  value={form.bodyHtml}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bodyHtml: e.target.value }))
                  }
                />
                {showPreview ? (
                  <div
                    className="flex flex-col gap-4 rounded-[20px] border border-onwei-blue/25 p-4 text-sm text-onwei-blue [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
                    // Staff-authored, same trust boundary as the storefront render.
                    dangerouslySetInnerHTML={{ __html: form.bodyHtml }}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-onwei-blue">
                  Cover image
                </span>
                {form.coverImageUrl ? (
                  <div className="relative overflow-hidden rounded-[20px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.coverImageUrl}
                      alt="Cover preview"
                      className="aspect-[416/280] w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-onwei-blue/70 p-2">
                      <label className="flex-1 cursor-pointer rounded-[30px] bg-onwei-white px-3 py-1.5 text-center font-cta text-xs uppercase text-onwei-blue">
                        Replace
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploading}
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadCover(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, coverImageUrl: "" }))
                        }
                        className="flex-1 rounded-[30px] border border-onwei-white px-3 py-1.5 font-cta text-xs uppercase text-onwei-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void uploadCover(file);
                    }}
                    className={`flex aspect-[416/280] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-4 text-center text-onwei-blue transition-colors ${
                      dragging
                        ? "border-onwei-purple bg-onwei-purple/10"
                        : "border-onwei-blue/30 hover:border-onwei-purple"
                    }`}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                    <span className="text-sm font-medium">
                      {uploading
                        ? "Uploading..."
                        : "Click to upload or drag a photo here"}
                    </span>
                    <span className="text-xs text-onwei-blue/70">
                      JPEG, PNG or WebP, up to 8MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCover(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                <span className="text-xs text-onwei-blue/70">
                  Shown on the Blogs page and at the top of the post.
                </span>
              </div>

              <div className="flex flex-col gap-2 border-t border-onwei-blue/10 pt-4">
                <AdminButton
                  type="button"
                  disabled={
                    submitting ||
                    uploading ||
                    !dirty ||
                    !form.title.trim() ||
                    !form.slug.trim()
                  }
                  onClick={save}
                >
                  {editingId ? "Save changes" : "Save as draft"}
                </AdminButton>
                <p className="text-xs text-onwei-blue/70">
                  {editingId
                    ? "Publish or unpublish from the list below."
                    : "Drafts stay hidden. Publish from the list below when it is ready."}
                </p>
                {error ? (
                  <p className="text-xs text-onwei-black">{error}</p>
                ) : null}
              </div>
            </div>
          </div>
        </AdminCard>
      ) : null}

      {items.length > 0 ? (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Title</AdminTableHeaderCell>
            <AdminTableHeaderCell>Page address</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {items.map((row) => {
              const item = {
                ...row,
                isPublished: publishedOverride[row.id] ?? row.isPublished,
              };
              return (
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
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </AdminButton>
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
              );
            })}
          </tbody>
        </AdminTable>
      ) : null}
    </div>
  );
}
