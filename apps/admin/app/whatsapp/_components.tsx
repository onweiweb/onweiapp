"use client";

import type { WhatsAppPurposeInfo, WhatsAppTemplateView } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GupshupPicker } from "./_picker";
import {
  AdminButton,
  AdminDialog,
  AdminInput,
  AdminSelect,
  Field,
  useConfirm,
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

/** {{n}} in the message, shown with the label of the value that fills it. */
function fillPreview(text: string, labels: string[]): string {
  return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, n: string) => {
    const label = labels[Number(n) - 1];
    return label ? `[${label}]` : match;
  });
}

function blanksInText(text: string): number {
  return new Set([...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => m[1]))
    .size;
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-6 items-center justify-center rounded-full bg-onwei-blue text-xs text-onwei-beige">
          {number}
        </span>
        {title}
      </h3>
      <div className="pl-8">{children}</div>
    </section>
  );
}

function WhatsAppTemplateForm({
  info,
  initial,
  problem,
  canManage,
  onDone,
}: {
  info: WhatsAppPurposeInfo;
  initial: WhatsAppTemplateView;
  problem: string | null;
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
  const changedTemplate =
    values.gupshupTemplateId !== initial.gupshupTemplateId;
  const labelFor = (key: string) =>
    info.variables.find((v) => v.key === key)?.label ?? key;
  const inText = blanksInText(values.previewText);

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
    toast(
      values.isActive
        ? "Saved."
        : "Saved. Send a test, then switch it on from the list.",
      "success",
    );
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
  const hasTemplate = Boolean(values.gupshupTemplateId);
  const preview = fillPreview(
    values.previewText,
    values.variables.map(labelFor),
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <Step number={1} title="Choose the template">
        <div className="flex flex-col gap-3">
          {hasTemplate ? (
            <p className="text-sm">
              {changedTemplate ? "New choice: " : "Using: "}
              <strong>{values.templateName || "a template"}</strong>
            </p>
          ) : null}
          {problem && !changedTemplate ? (
            <p className="rounded-xl bg-onwei-beige/60 px-3 py-2 text-sm text-onwei-black">
              {problem} Pick an approved one below.
            </p>
          ) : null}
          {canManage ? (
            <GupshupPicker
              info={info}
              currentId={values.gupshupTemplateId}
              currentImageUrl={values.headerImageUrl}
              onPick={(picked) => setValues((v) => ({ ...v, ...picked }))}
            />
          ) : null}
        </div>
      </Step>

      {hasTemplate ? (
        <Step number={2} title="Check what gets filled in">
          <div className="flex flex-col gap-4">
            {values.previewText ? (
              <div className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-onwei-beige/50 px-4 py-3 text-sm">
                {preview}
              </div>
            ) : null}
            {values.variables.length > 0 ? (
              <div className="flex flex-col gap-2">
                {values.variables.map((key, index) => (
                  <label
                    key={index}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="w-40 text-onwei-blue/70">
                      {index < inText
                        ? `Blank ${index + 1} in the message`
                        : "End of the button link"}
                    </span>
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
                  </label>
                ))}
                <p className="text-xs text-onwei-blue/60">
                  Already set to the usual order. Change one only if the preview
                  reads wrong.
                </p>
              </div>
            ) : null}
          </div>
        </Step>
      ) : null}

      {hasTemplate && values.headerType === "IMAGE" ? (
        <Step number={3} title="Image at the top">
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
                  No image yet. Add one before switching this message on.
                </span>
              )}
              {canManage ? (
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
              ) : null}
              {uploading ? (
                <span className="text-xs text-onwei-blue/70">Uploading...</span>
              ) : null}
            </div>
          </Field>
        </Step>
      ) : null}

      {canManage ? (
        <div className="flex justify-end gap-2">
          <AdminButton type="button" variant="secondary" onClick={onDone}>
            Cancel
          </AdminButton>
          <AdminButton
            type="submit"
            disabled={!dirty || saving || !hasTemplate}
          >
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

/** Why a message can't be switched on yet, or undefined when it can. */
function blockedReasonOf(
  template: WhatsAppTemplateView,
  problem: string | null,
): string | undefined {
  if (!template.gupshupTemplateId) return "Choose a template first.";
  if (template.headerType === "IMAGE" && !template.headerImageUrl) {
    return "Add the image first (Change template).";
  }
  if (problem) return "Pick an approved template first.";
  return undefined;
}

/** Switches one message on or off, under its status on the row. */
export function WhatsAppSwitch({
  info,
  template,
  problem,
}: {
  info: WhatsAppPurposeInfo;
  template: WhatsAppTemplateView;
  problem: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [switching, setSwitching] = useState(false);
  const blocked = template.isActive
    ? undefined
    : blockedReasonOf(template, problem);

  async function toggle() {
    const turningOn = !template.isActive;
    const ok = await confirm({
      title: turningOn
        ? `Start sending "${info.title}"?`
        : `Stop sending "${info.title}"?`,
      message: turningOn
        ? `${info.whenSent} Customers get it from now on, so send yourself a test first.`
        : "Customers stop getting this WhatsApp until you switch it back on.",
      confirmLabel: turningOn ? "Switch on" : "Switch off",
      danger: !turningOn,
    });
    if (!ok) return;
    setSwitching(true);
    const result = await postJson("/api/whatsapp/templates", "PATCH", {
      purpose: template.purpose,
      isActive: turningOn,
    });
    setSwitching(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast(turningOn ? "Switched on." : "Switched off.", "success");
    router.refresh();
  }

  if (blocked) return null;
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={switching}
      className="ml-2 text-xs underline underline-offset-2 disabled:opacity-60"
    >
      {switching ? "Saving..." : template.isActive ? "Switch off" : "Switch on"}
    </button>
  );
}

/** Choose or change the template, and send a test, each in a popup. */
export function WhatsAppRowActions({
  info,
  template,
  problem,
  canManage,
}: {
  info: WhatsAppPurposeInfo;
  template: WhatsAppTemplateView;
  /** Why the saved template can't be used now, from the page. */
  problem: string | null;
  canManage: boolean;
}) {
  const [open, setOpen] = useState<"edit" | "test" | null>(null);
  const close = () => setOpen(null);
  const hasTemplate = Boolean(template.gupshupTemplateId);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <AdminButton
        type="button"
        variant="secondary"
        onClick={() => setOpen("edit")}
      >
        {!canManage ? "View" : hasTemplate ? "Change" : "Choose template"}
      </AdminButton>
      {canManage ? (
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => setOpen("test")}
          disabled={!hasTemplate}
          title={hasTemplate ? undefined : "Choose a template first"}
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
            {info.whenSent} Needs an approved{" "}
            <strong>{info.category.toLowerCase()}</strong> template
            {info.category === "Authentication" ? "" : " (or marketing)"}.
          </>
        }
      >
        <WhatsAppTemplateForm
          info={info}
          initial={template}
          problem={problem}
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
