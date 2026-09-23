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

export interface ValuePropRow {
  id: string;
  illustrationUrl: string;
  width: number;
  height: number;
  title: string;
  body: string;
}

// Shared Homepage + PDP "value prop" cards — one CMS list, both pages read
// the same rows (packages/core's listValueProps).
export function ValuePropsEditor({ items }: { items: ValuePropRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    illustrationUrl: "",
    width: "",
    height: "",
    title: "",
    bodyText: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function add() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/content/value-props", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          illustrationUrl: form.illustrationUrl,
          width: Number(form.width),
          height: Number(form.height),
          title: form.title,
          bodyText: form.bodyText,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Couldn't add that value prop.");
        return;
      }
      setForm({
        illustrationUrl: "",
        width: "",
        height: "",
        title: "",
        bodyText: "",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setSubmitting(true);
    await fetch(`/api/content/value-props/${id}`, { method: "DELETE" });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Title</AdminTableHeaderCell>
            <AdminTableHeaderCell>Body</AdminTableHeaderCell>
            <AdminTableHeaderCell>Illustration</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>{item.title}</AdminTableCell>
                <AdminTableCell className="max-w-xs">
                  {item.body}
                </AdminTableCell>
                <AdminTableCell>{item.illustrationUrl}</AdminTableCell>
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
        <p className="text-sm text-onwei-blue/70">No value props yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <AdminInput
          placeholder="Illustration URL"
          value={form.illustrationUrl}
          onChange={(e) =>
            setForm((f) => ({ ...f, illustrationUrl: e.target.value }))
          }
        />
        <AdminInput
          type="number"
          placeholder="Width"
          className="w-24"
          value={form.width}
          onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
        />
        <AdminInput
          type="number"
          placeholder="Height"
          className="w-24"
          value={form.height}
          onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
        />
        <AdminInput
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <AdminInput
          placeholder="Body"
          value={form.bodyText}
          onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
        />
        <AdminButton type="button" disabled={submitting} onClick={add}>
          Add
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </div>
  );
}
