"use client";

import type { WhatsAppPurposeInfo, WhatsAppTemplateView } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IMAGE_PRESETS, UPLOAD_HELP, uploadImage } from "../_lib/imageUpload";
import {
  PhonePreview,
  TemplateList,
} from "../_components/WhatsAppTemplateParts";
import { pickedFrom, useApprovedTemplates } from "./_picker";
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
    <section className="flex flex-col gap-2.5">
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
  const { templates, waiting, error } = useApprovedTemplates(info.purpose);
  const [values, setValues] = useState<Values>(() => pick(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(pick(initial)));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;
  const changedTemplate =
    values.gupshupTemplateId !== initial.gupshupTemplateId;
  const labelFor = (key: string) =>
    info.variables.find((v) => v.key === key)?.label ?? key;
  const chosen =
    templates?.find((t) => t.id === values.gupshupTemplateId) ?? null;
  const inText = chosen?.bodyValues ?? blanksInText(values.previewText);
  const hasTemplate = Boolean(values.gupshupTemplateId);
  const disabled = !canManage || saving;

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
    const result = await uploadImage(
      "/api/whatsapp/image",
      file,
      IMAGE_PRESETS.whatsapp,
    );
    setUploading(false);
    const url = result.ok ? result.data.url : null;
    if (typeof url !== "string") {
      toast(
        result.ok ? "The image didn't upload. Try again." : result.error,
        "error",
      );
      return;
    }
    set("headerImageUrl", url);
    toast("Image uploaded. Save to use it.", "success");
  }

  return (
    <form
      onSubmit={save}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <Step number={1} title="Choose the template">
          <div className="flex flex-col gap-2">
            {problem && !changedTemplate ? (
              <p className="rounded-xl bg-onwei-beige/60 px-3 py-2 text-sm text-onwei-black">
                {problem} Pick an approved one below.
              </p>
            ) : null}
            {canManage ? (
              <TemplateList
                templates={templates}
                error={error}
                emptyText={`No approved ${info.category.toLowerCase()} templates in Gupshup yet. Create one there and come back once WhatsApp approves it.`}
                chosenId={values.gupshupTemplateId || null}
                onPick={(t) =>
                  setValues((v) => ({
                    ...v,
                    ...pickedFrom(t, v.headerImageUrl),
                  }))
                }
              />
            ) : (
              <p className="text-sm">
                {values.templateName || "No template chosen yet."}
              </p>
            )}
            {waiting > 0 ? (
              <p className="text-xs text-onwei-blue/60">
                {waiting} more {waiting === 1 ? "template is" : "templates are"}{" "}
                waiting for WhatsApp&apos;s approval.
              </p>
            ) : null}
          </div>
        </Step>

        {hasTemplate && values.variables.length > 0 ? (
          <Step number={2} title="Fill in the blanks">
            <div className="flex flex-col gap-2">
              {values.variables.map((key, index) => (
                <label
                  key={index}
                  className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 text-sm"
                >
                  <span className="text-onwei-blue/70">
                    {index < inText
                      ? `Blank ${index + 1}`
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
          </Step>
        ) : null}

        {hasTemplate && values.headerType === "IMAGE" ? (
          <Step number={3} title="Image at the top">
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-onwei-blue/70">
                JPEG or PNG, landscape (about 1200 by 628). Sent with every
                message. {UPLOAD_HELP}
                {values.headerImageUrl
                  ? ""
                  : " Add one before switching this message on."}
              </span>
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
      </div>

      <aside className="lg:sticky lg:top-0 lg:self-start">
        {chosen ? (
          <PhonePreview
            template={chosen}
            values={values.variables.map((k) => labelFor(k))}
            imageUrl={values.headerImageUrl}
          />
        ) : values.previewText ? (
          <div className="whitespace-pre-line rounded-2xl bg-onwei-beige/50 px-4 py-3 text-sm">
            {values.previewText}
          </div>
        ) : (
          <PhonePreview template={null} values={[]} imageUrl={null} />
        )}
      </aside>
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
        size="xl"
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
