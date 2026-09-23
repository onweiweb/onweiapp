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
} from "./ui";

export interface InstagramPhotoRow {
  id: string;
  imageUrl: string;
  altText: string | null;
}

export function InstagramPhotosEditor({
  items,
}: {
  items: InstagramPhotoRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ imageUrl: "", altText: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function add() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/content/instagram-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Couldn't add that photo.");
        return;
      }
      setForm({ imageUrl: "", altText: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setSubmitting(true);
    await fetch(`/api/content/instagram-photos/${id}`, { method: "DELETE" });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Image URL</AdminTableHeaderCell>
            <AdminTableHeaderCell>Alt text</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>{item.imageUrl}</AdminTableCell>
                <AdminTableCell>{item.altText ?? "—"}</AdminTableCell>
                <AdminTableCell>
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
        <p className="text-sm text-onwei-blue/70">No Instagram photos yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <AdminInput
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
        />
        <AdminInput
          placeholder="Alt text (what the photo shows)"
          value={form.altText}
          onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))}
        />
        <AdminButton type="button" disabled={submitting} onClick={add}>
          Add
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
