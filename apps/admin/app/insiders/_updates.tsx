"use client";

import type { UpdateRow } from "./_updateRow";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminButton,
  AdminDialog,
  AdminInput,
  AdminTextarea,
  Field,
  useConfirm,
  useToast,
} from "../_components/ui";

const EMPTY: Omit<UpdateRow, "id"> = {
  title: "",
  body: "",
  eventDate: "",
  imageUrl: "",
  linkUrl: "",
  linkLabel: "",
  isActive: true,
  sortOrder: 0,
};

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  return ((await response?.json().catch(() => null)) ?? { ok: false }) as {
    ok: boolean;
    error?: string;
    url?: string;
  };
}

function UpdateForm({
  initial,
  onDone,
}: {
  initial: UpdateRow | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const start = initial ?? { id: "", ...EMPTY };
  const [values, setValues] = useState(start);
  const [baseline, setBaseline] = useState(() => JSON.stringify(start));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;

  function set<K extends keyof UpdateRow>(key: K, value: UpdateRow[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function upload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/insiders/updates/image", {
      method: "POST",
      body: form,
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      url?: string;
      error?: string;
    } | null;
    setUploading(false);
    if (!data?.ok || !data.url) {
      toast(data?.error ?? "The photo didn't upload. Try again.", "error");
      return;
    }
    set("imageUrl", data.url);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const body = {
      title: values.title,
      body: values.body,
      eventDate: values.eventDate || null,
      imageUrl: values.imageUrl || null,
      linkUrl: values.linkUrl || null,
      linkLabel: values.linkLabel || null,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    };
    const result = initial
      ? await send(`/api/insiders/updates/${initial.id}`, "PATCH", body)
      : await send("/api/insiders/updates", "POST", body);
    setSaving(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't save. Try again.", "error");
      return;
    }
    setBaseline(JSON.stringify(values));
    toast(initial ? "Saved." : "Added to the Insiders page.", "success");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Field label="Title" hint="Short, like “Saturday pickleball meetup”.">
        <AdminInput
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={120}
          required
        />
      </Field>
      <Field
        label="What to say"
        hint="A few lines. Line breaks show as written."
      >
        <AdminTextarea
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
          rows={4}
          maxLength={1000}
          required
        />
      </Field>
      <div className="grid gap-4 desk:grid-cols-2">
        <Field
          label="Date (optional)"
          hint="For events. Leave empty for offers."
        >
          <AdminInput
            type="date"
            value={values.eventDate}
            onChange={(e) => set("eventDate", e.target.value)}
          />
        </Field>
        <Field label="Order" hint="Lower numbers show first.">
          <AdminInput
            type="number"
            min={0}
            max={999}
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
          />
        </Field>
      </div>
      <div className="grid gap-4 desk:grid-cols-2">
        <Field
          label="Button link (optional)"
          hint="https://… or a page on our site, like /collection/all."
        >
          <AdminInput
            value={values.linkUrl}
            onChange={(e) => set("linkUrl", e.target.value)}
          />
        </Field>
        <Field label="Button text" hint="Empty shows “find out more”.">
          <AdminInput
            value={values.linkLabel}
            onChange={(e) => set("linkLabel", e.target.value)}
            maxLength={30}
            disabled={!values.linkUrl}
          />
        </Field>
      </div>
      <Field
        label="Photo (optional)"
        hint="JPEG, PNG or WebP, up to 5MB. Shown wide, about 16 by 10."
      >
        <div className="flex flex-wrap items-center gap-3">
          {values.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.imageUrl}
              alt=""
              className="h-16 w-24 rounded object-cover"
            />
          ) : null}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
            className="text-sm"
          />
          {values.imageUrl ? (
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => set("imageUrl", "")}
            >
              Remove photo
            </AdminButton>
          ) : null}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm text-onwei-blue">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
        />
        Show it on the Insiders page
      </label>
      <div className="flex justify-end gap-2">
        <AdminButton type="button" variant="secondary" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" disabled={!dirty || saving || uploading}>
          {saving ? "Saving..." : initial ? "Save" : "Add update"}
        </AdminButton>
      </div>
    </form>
  );
}

export function AddUpdateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AdminButton type="button" onClick={() => setOpen(true)}>
        Add an update
      </AdminButton>
      <AdminDialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Add an Insiders page update"
        description="An event or an offer for Insiders. It shows on onwei.in/insiders under the signup form."
      >
        {open ? (
          <UpdateForm initial={null} onDone={() => setOpen(false)} />
        ) : null}
      </AdminDialog>
    </>
  );
}

export function UpdateActions({ update }: { update: UpdateRow }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function remove() {
    const ok = await confirm({
      title: `Remove "${update.title}"?`,
      message: "It comes off the Insiders page straight away.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    const result = await send(`/api/insiders/updates/${update.id}`, "DELETE");
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast("Removed.", "success");
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-2">
      <AdminButton
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Edit
      </AdminButton>
      <AdminButton type="button" variant="secondary" onClick={remove}>
        Remove
      </AdminButton>
      <AdminDialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Edit update"
      >
        {open ? (
          <UpdateForm initial={update} onDone={() => setOpen(false)} />
        ) : null}
      </AdminDialog>
    </div>
  );
}
