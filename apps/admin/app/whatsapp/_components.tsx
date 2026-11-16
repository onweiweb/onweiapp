"use client";

import type { WhatsAppPurposeInfo, WhatsAppTemplateView } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminButton,
  AdminDialog,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  Field,
  useToast,
} from "../_components/ui";

type Values = Omit<WhatsAppTemplateView, "purpose" | "updatedAt">;

function pick(initial: WhatsAppTemplateView): Values {
  return {
    gupshupTemplateId: initial.gupshupTemplateId,
    templateName: initial.templateName,
    language: initial.language,
    variables: initial.variables,
    headerType: initial.headerType,
    headerImageUrl: initial.headerImageUrl,
    previewText: initial.previewText,
    isActive: initial.isActive,
  };
}

async function postJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return ((await response?.json().catch(() => null)) ?? {
    ok: false,
  }) as { ok: boolean; error?: string; url?: string };
}

function WhatsAppTemplateForm({
  info,
  initial,
  canManage,
  onDone,
}: {
  info: WhatsAppPurposeInfo;
  initial: WhatsAppTemplateView;
  canManage: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() => pick(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(pick(initial)));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;
  const labelFor = (key: string) =>
    info.variables.find((v) => v.key === key)?.label ?? key;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setVariable(index: number, key: string) {
    set(
      "variables",
      values.variables.map((v, i) => (i === index ? key : v)),
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await postJson("/api/whatsapp/templates", "PUT", {
      purpose: initial.purpose,
      ...values,
    });
    setSaving(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't save. Try again.", "error");
      return;
    }
    setBaseline(JSON.stringify(values));
    toast("Saved.", "success");
    router.refresh();
    onDone();
  }

  async function upload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/whatsapp/image", {
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
      toast(data?.error ?? "The image didn't upload. Try again.", "error");
      return;
    }
    set("headerImageUrl", data.url);
    toast("Image uploaded. Save to use it.", "success");
  }

  const disabled = !canManage || saving;

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid gap-4 desk:grid-cols-2">
        <Field
          label="Gupshup template ID"
          hint="The long ID on the template's page in Gupshup, not the Facebook one."
        >
          <AdminInput
            value={values.gupshupTemplateId}
            onChange={(e) => set("gupshupTemplateId", e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field
          label="Template name"
          hint="As named in Gupshup, so staff can find it there."
        >
          <AdminInput
            value={values.templateName}
            onChange={(e) => set("templateName", e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field
        label="Values to fill in, in order"
        hint="{{1}} gets the first value, {{2}} the second, and so on. A button that needs a value takes the last one."
      >
        <div className="flex flex-col gap-2">
          {values.variables.map((key, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-12 text-sm text-onwei-blue/70">{`{{${index + 1}}}`}</span>
              <AdminSelect
                value={key}
                onChange={(e) => setVariable(index, e.target.value)}
                disabled={disabled}
              >
                {info.variables.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </AdminSelect>
              {values.variables.length > 1 ? (
                <AdminButton
                  type="button"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() =>
                    set(
                      "variables",
                      values.variables.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </AdminButton>
              ) : null}
            </div>
          ))}
          <div>
            <AdminButton
              type="button"
              variant="secondary"
              disabled={disabled || values.variables.length >= 10}
              onClick={() =>
                set("variables", [...values.variables, info.variables[0]!.key])
              }
            >
              Add a value
            </AdminButton>
          </div>
          <span className="text-xs text-onwei-blue/70">
            Now filled in as:{" "}
            {values.variables
              .map((k, i) => `{{${i + 1}}} ${labelFor(k)}`)
              .join(", ")}
          </span>
        </div>
      </Field>

      {info.allowsImage ? (
        <div className="grid gap-4 desk:grid-cols-2">
          <Field
            label="Top of the message"
            hint="Match what the template has in Gupshup."
          >
            <AdminSelect
              value={values.headerType}
              onChange={(e) =>
                set("headerType", e.target.value as Values["headerType"])
              }
              disabled={disabled}
            >
              <option value="NONE">Nothing</option>
              <option value="TEXT">A line of text (set in Gupshup)</option>
              <option value="IMAGE">An image</option>
            </AdminSelect>
          </Field>
          {values.headerType === "IMAGE" ? (
            <Field
              label="Image"
              hint="JPEG or PNG under 5MB, landscape (about 1200 by 628). Sent with every message."
            >
              <div className="flex flex-col gap-2">
                {values.headerImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={values.headerImageUrl}
                    alt=""
                    className="max-h-40 w-fit rounded-xl border border-onwei-beige"
                  />
                ) : (
                  <span className="text-sm text-onwei-blue/70">
                    No image yet.
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={disabled || uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <span className="text-xs text-onwei-blue/70">
                    Uploading...
                  </span>
                ) : null}
              </div>
            </Field>
          ) : null}
        </div>
      ) : null}

      <Field
        label="Message text (for reference)"
        hint="Paste the approved text from Gupshup so staff can see what customers get. It doesn't change the message."
      >
        <AdminTextarea
          rows={4}
          value={values.previewText}
          onChange={(e) => set("previewText", e.target.value)}
          disabled={disabled}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            disabled={disabled}
          />
          Send this message
        </label>
        <p className="text-xs text-onwei-blue/70">
          Only switch it on once WhatsApp has approved the template and a test
          looked right.
        </p>
      </div>

      {canManage ? (
        <div className="flex justify-end gap-2">
          <AdminButton type="button" variant="secondary" onClick={onDone}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save"}
          </AdminButton>
        </div>
      ) : (
        <p className="text-xs text-onwei-blue/70">
          You can see these settings but not change them.
        </p>
      )}
    </form>
  );
}

function TestSendForm({
  purpose,
  onDone,
}: {
  purpose: WhatsAppTemplateView["purpose"];
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    const result = await postJson("/api/whatsapp/test", "POST", {
      purpose,
      phone,
    });
    setSending(false);
    if (!result.ok) {
      toast(result.error ?? "The test didn't send.", "error");
      return;
    }
    toast("Test sent. Check WhatsApp on that phone.", "success");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      <Field
        label="Phone number"
        hint="Uses sample values (name Priya, code 482913 or WEI4821). Works even while the message is switched off."
      >
        <AdminInput
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="98765 43210"
          inputMode="tel"
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-2">
        <AdminButton type="button" variant="secondary" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" disabled={sending || !phone.trim()}>
          {sending ? "Sending..." : "Send test"}
        </AdminButton>
      </div>
    </form>
  );
}

/** The Edit and Send test buttons on each row, each opening a popup. */
export function WhatsAppRowActions({
  info,
  template,
  canManage,
}: {
  info: WhatsAppPurposeInfo;
  template: WhatsAppTemplateView;
  canManage: boolean;
}) {
  const [open, setOpen] = useState<"edit" | "test" | null>(null);
  const close = () => setOpen(null);
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <AdminButton
        type="button"
        variant="secondary"
        onClick={() => setOpen("edit")}
      >
        {canManage ? "Edit" : "View"}
      </AdminButton>
      {canManage ? (
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => setOpen("test")}
          disabled={!template.gupshupTemplateId}
          title={
            template.gupshupTemplateId
              ? undefined
              : "Save the Gupshup template ID first"
          }
        >
          Send test
        </AdminButton>
      ) : null}

      <AdminDialog
        open={open === "edit"}
        onClose={close}
        size="lg"
        title={info.title}
        description={
          <>
            {info.whenSent} Approve it in Gupshup under the{" "}
            <strong>{info.category}</strong> category.
          </>
        }
      >
        <WhatsAppTemplateForm
          info={info}
          initial={template}
          canManage={canManage}
          onDone={close}
        />
      </AdminDialog>

      <AdminDialog
        open={open === "test"}
        onClose={close}
        size="sm"
        title={`Test: ${info.title}`}
      >
        <TestSendForm purpose={template.purpose} onDone={close} />
      </AdminDialog>
    </div>
  );
}
