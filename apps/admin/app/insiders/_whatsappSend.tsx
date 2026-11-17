"use client";

import type { GupshupTemplateSummary, InsiderPickRow } from "@onwei/core";
import {
  CAMPAIGN_BATCH_SIZE,
  CAMPAIGN_FILL_LABELS,
  CAMPAIGN_GROUP_LABELS,
  CAMPAIGN_GROUPS,
  checkCampaignFill,
  sampleCampaignParams,
  type CampaignFillKind,
  type CampaignFillSlot,
  type CampaignGroup,
} from "@onwei/core/campaign-fill";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminBadge,
  AdminButton,
  AdminInput,
  AdminSelect,
  Field,
  useConfirm,
  useToast,
} from "../_components/ui";

type Template = GupshupTemplateSummary & { suggestedFill: CampaignFillSlot[] };

type Plan = {
  matched: number;
  optedOut: number;
  unsubscribed: number;
  missingCode: number;
  alreadyGot: number;
  repeats: number;
  willGet: number;
  overLimit: boolean;
};

type Progress = {
  total: number;
  done: number;
  sent: number;
  failed: number;
  skipped: number;
  running: boolean;
  stopped: boolean;
};

type Picked = Pick<InsiderPickRow, "id" | "fullName" | "insiderCode">;

/** Meta's lowest daily limit for a new WhatsApp number. */
const DAILY_LIMIT_HINT = 250;

const BODY_KINDS: CampaignFillKind[] = [
  "firstName",
  "fullName",
  "insiderCode",
  "addressLink",
  "text",
];
const BUTTON_KINDS: CampaignFillKind[] = [
  "addressToken",
  "insiderCode",
  "text",
];

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return ((await response?.json().catch(() => null)) ?? {
    ok: false,
  }) as { ok: boolean; error?: string } & Partial<T>;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
}

// ---------- Layout pieces ----------

function Step({
  n,
  title,
  hint,
  done,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-onwei-beige bg-onwei-white p-5 sm:p-6">
      <header className="mb-4 flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-grotesk text-sm font-semibold ${
            done
              ? "bg-onwei-green text-onwei-blue"
              : "bg-onwei-blue text-onwei-beige"
          }`}
          aria-hidden
        >
          {done ? "✓" : n}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-onwei-blue">{title}</h3>
          {hint ? <p className="text-sm text-onwei-blue/70">{hint}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition ${
        active
          ? "bg-onwei-blue text-onwei-beige"
          : "border border-onwei-blue/25 text-onwei-blue hover:border-onwei-blue"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Phone preview ----------

function PreviewText({ text, values }: { text: string; values: string[] }) {
  const parts = text.split(/(\{\{\s*\d+\s*\}\})/g);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-[#111b21]">
      {parts.map((part, i) => {
        const match = /^\{\{\s*(\d+)\s*\}\}$/.exec(part);
        if (!match) return <span key={i}>{part}</span>;
        const value = values[Number(match[1]) - 1];
        return (
          <mark
            key={i}
            className="rounded bg-onwei-green px-0.5 text-[#111b21]"
          >
            {value ?? part}
          </mark>
        );
      })}
    </p>
  );
}

function PhonePreview({
  template,
  fill,
  imageUrl,
}: {
  template: Template | null;
  fill: CampaignFillSlot[];
  imageUrl: string | null;
}) {
  const values = sampleCampaignParams(fill);
  return (
    <div className="mx-auto w-full max-w-[20rem] rounded-[2.5rem] border-[10px] border-onwei-black bg-onwei-black shadow-xl">
      <div className="overflow-hidden rounded-[1.8rem]">
        <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-onwei-beige font-grotesk text-xs font-bold text-onwei-blue">
            ON
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Onwei</p>
            <p className="text-[11px] opacity-80">Business account</p>
          </div>
        </div>
        <div className="min-h-[26rem] bg-[#efe7dd] p-3">
          {template ? (
            <div className="max-w-[92%]">
              <div className="rounded-lg rounded-tl-none bg-white p-1.5 shadow-sm">
                {template.header === "IMAGE" ? (
                  imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="mb-1.5 aspect-[1.91/1] w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="mb-1.5 flex aspect-[1.91/1] w-full items-center justify-center rounded-md bg-onwei-beige text-xs text-onwei-blue/60">
                      Image goes here
                    </div>
                  )
                ) : null}
                <div className="px-1.5 pb-1">
                  <PreviewText text={template.bodyText} values={values} />
                  {template.footer ? (
                    <p className="mt-1.5 text-[11px] text-[#667781]">
                      {template.footer}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-right text-[10px] text-[#667781]">
                    10:24
                  </p>
                </div>
              </div>
              {template.buttons.map((button, i) => (
                <div
                  key={i}
                  className="mt-1 rounded-lg bg-white py-2 text-center text-[13px] font-medium text-[#00a5f4] shadow-sm"
                >
                  {button.type === "URL" ? "↗ " : ""}
                  {button.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-24 text-center text-sm text-[#667781]">
              Pick a template to see the message here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Step 1: template ----------

function TemplatePicker({
  templates,
  error,
  chosenId,
  onPick,
}: {
  templates: Template[] | null;
  error: string | null;
  chosenId: string | null;
  onPick: (template: Template) => void;
}) {
  if (error) {
    return (
      <p className="rounded-2xl bg-onwei-beige px-4 py-3 text-sm text-onwei-blue">
        {error}
      </p>
    );
  }
  if (!templates) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-onwei-beige/70"
          />
        ))}
      </div>
    );
  }
  if (templates.length === 0) {
    return (
      <p className="rounded-2xl bg-onwei-beige px-4 py-3 text-sm text-onwei-blue">
        No approved utility or marketing templates yet. Once Gupshup approves
        one, it shows up here.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => {
        const chosen = template.id === chosenId;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition ${
              chosen
                ? "border-onwei-blue bg-onwei-blue/[0.04] ring-2 ring-onwei-blue"
                : "border-onwei-blue/15 hover:border-onwei-blue/50"
            }`}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="break-all font-medium text-onwei-blue">
                {template.name}
              </span>
              <AdminBadge
                tone={template.category === "UTILITY" ? "success" : "active"}
              >
                {template.category.toLowerCase()}
              </AdminBadge>
              {template.header === "IMAGE" ? (
                <AdminBadge tone="pending">image</AdminBadge>
              ) : null}
            </span>
            <span className="line-clamp-3 text-sm text-onwei-blue/70">
              {template.bodyText}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Step 2: fill ----------

function FillEditor({
  template,
  fill,
  onChange,
  imageUrl,
  onImage,
  disabled,
}: {
  template: Template;
  fill: CampaignFillSlot[];
  onChange: (fill: CampaignFillSlot[]) => void;
  imageUrl: string | null;
  onImage: (url: string | null) => void;
  disabled: boolean;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const linkButton = template.buttons.find((b) => b.type === "URL");

  function setSlot(index: number, slot: CampaignFillSlot) {
    onChange(fill.map((s, i) => (i === index ? slot : s)));
  }

  async function upload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/insiders/whatsapp/image", {
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
    onImage(data.url);
  }

  return (
    <div className="flex flex-col gap-4">
      {fill.length === 0 ? (
        <p className="text-sm text-onwei-blue/70">
          This message has no blanks. Everyone gets the same text.
        </p>
      ) : null}
      {fill.map((slot, index) => {
        const isButton = index >= template.bodyValues;
        const kinds = isButton ? BUTTON_KINDS : BODY_KINDS;
        return (
          <div
            key={index}
            className="grid gap-2 rounded-2xl bg-onwei-beige/50 p-3 sm:grid-cols-[9rem_1fr] sm:items-center"
          >
            <span className="text-sm font-medium text-onwei-blue">
              {isButton
                ? `End of the “${linkButton?.text ?? "button"}” link`
                : `Blank {{${index + 1}}}`}
            </span>
            <div className="flex flex-col gap-2">
              <AdminSelect
                value={slot.kind}
                disabled={disabled}
                onChange={(e) =>
                  setSlot(index, {
                    kind: e.target.value as CampaignFillKind,
                    ...(e.target.value === "text" ? { text: "" } : {}),
                  })
                }
                className="bg-onwei-white"
              >
                {kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {CAMPAIGN_FILL_LABELS[kind]}
                  </option>
                ))}
              </AdminSelect>
              {slot.kind === "text" ? (
                <AdminInput
                  value={slot.text ?? ""}
                  disabled={disabled}
                  maxLength={300}
                  placeholder="e.g. Saturday 23 Nov, 7 am"
                  onChange={(e) =>
                    setSlot(index, { kind: "text", text: e.target.value })
                  }
                  className="bg-onwei-white"
                />
              ) : null}
            </div>
          </div>
        );
      })}
      {isButtonHint(template) ? (
        <p className="text-xs text-onwei-blue/70">
          For a button that opens the address form, the button&apos;s link in
          Gupshup should be https://www.onwei.in/insider/address?t={"{{1}}"} and
          this blank set to &ldquo;Address form link (end of button
          link)&rdquo;.
        </p>
      ) : null}

      {template.header === "IMAGE" ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-onwei-beige/50 p-3">
          <span className="text-sm font-medium text-onwei-blue">
            Image at the top
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`inline-flex cursor-pointer items-center rounded-[30px] border border-onwei-blue px-4 py-2 text-sm text-onwei-blue ${
                disabled || uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {uploading
                ? "Uploading..."
                : imageUrl
                  ? "Change image"
                  : "Upload image"}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {template.sampleImageUrl && imageUrl !== template.sampleImageUrl ? (
              <button
                type="button"
                className="text-sm text-onwei-blue underline"
                onClick={() => onImage(template.sampleImageUrl)}
              >
                Use the image from Gupshup
              </button>
            ) : null}
          </div>
          <span className="text-xs text-onwei-blue/70">
            JPEG or PNG, up to 5MB. Wide images (about 1.9 to 1) look best.
          </span>
        </div>
      ) : null}
    </div>
  );
}

function isButtonHint(template: Template) {
  return template.buttonValues > 0;
}

// ---------- Step 3: who ----------

function PeoplePicker({
  picked,
  onChange,
}: {
  picked: Picked[];
  onChange: (picked: Picked[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<InsiderPickRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      const response = await fetch(
        `/api/insiders/email/recipients?q=${encodeURIComponent(q)}`,
      ).catch(() => null);
      const data = (await response?.json().catch(() => null)) as {
        ok: boolean;
        rows?: InsiderPickRow[];
      } | null;
      setSearching(false);
      setFound(data?.ok ? (data.rows ?? []) : []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const rows = query.trim().length < 2 ? [] : found;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Find people" hint="Name, email or Insider code.">
        <AdminInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Sakshi, or WEI6615"
        />
      </Field>
      {searching ? (
        <p className="text-sm text-onwei-blue/60">Searching...</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="divide-y divide-onwei-blue/10 rounded-2xl border border-onwei-blue/15">
          {rows.map((row) => {
            const on = picked.some((p) => p.id === row.id);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      on
                        ? picked.filter((p) => p.id !== row.id)
                        : [
                            ...picked,
                            {
                              id: row.id,
                              fullName: row.fullName,
                              insiderCode: row.insiderCode,
                            },
                          ],
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-onwei-beige/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-onwei-blue">
                      {row.fullName}
                    </span>
                    <span className="block truncate text-xs text-onwei-blue/60">
                      {row.insiderCode ?? "No code yet"}
                    </span>
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                      on
                        ? "border-onwei-blue bg-onwei-blue text-onwei-beige"
                        : "border-onwei-blue/30"
                    }`}
                  >
                    {on ? "✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {picked.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {picked.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(picked.filter((x) => x.id !== p.id))}
              className="rounded-full bg-onwei-purple/20 px-3 py-1 text-sm text-onwei-blue"
              title="Remove"
            >
              {p.fullName} ✕
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlanSummary({
  plan,
  loading,
  allowRepeat,
  onAllowRepeat,
}: {
  plan: Plan | null;
  loading: boolean;
  allowRepeat: boolean;
  onAllowRepeat: (value: boolean) => void;
}) {
  if (!plan) {
    return loading ? (
      <div className="h-24 animate-pulse rounded-2xl bg-onwei-beige/70" />
    ) : null;
  }
  const skips = [
    plan.optedOut > 0 && `${plural(plan.optedOut, "person")} replied STOP`,
    plan.unsubscribed > 0 &&
      `${plural(plan.unsubscribed, "person")} unsubscribed from Insider messages`,
    plan.missingCode > 0 &&
      `${plural(plan.missingCode, "person")} without an Insider code yet (the message needs it)`,
    plan.alreadyGot > 0 &&
      `${plural(plan.alreadyGot, "person")} already got this template`,
  ].filter(Boolean) as string[];
  const repeatCount = plan.alreadyGot + plan.repeats;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl bg-onwei-beige/60 p-4 ${loading ? "opacity-60" : ""}`}
    >
      <p className="text-onwei-blue">
        <span className="font-grotesk text-3xl font-semibold">
          {plan.willGet.toLocaleString("en-IN")}
        </span>{" "}
        <span className="text-sm">
          will get it, out of {plural(plan.matched, "Insider")} in this group
        </span>
      </p>
      {skips.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-onwei-blue/80">
          {skips.map((line) => (
            <li key={line}>Left out: {line}</li>
          ))}
        </ul>
      ) : null}
      {repeatCount > 0 ? (
        <label className="flex items-start gap-2 text-sm text-onwei-blue">
          <input
            type="checkbox"
            checked={allowRepeat}
            onChange={(e) => onAllowRepeat(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-onwei-blue"
          />
          <span>
            Send again to the {plural(repeatCount, "person", "people")} who
            already got this template
          </span>
        </label>
      ) : null}
      {plan.overLimit ? (
        <p className="text-sm text-onwei-black">
          This group is bigger than one send can take, so only the first 5,000
          (oldest signups) are included. Send the rest later with a date range.
        </p>
      ) : null}
      {plan.willGet > DAILY_LIMIT_HINT ? (
        <p className="text-sm text-onwei-blue/80">
          Heads up: WhatsApp limits how many different people a business can
          message a day (250 to 1,000 for a new number, more once Meta raises
          it). Anyone over today&apos;s limit shows as failed in the log.
        </p>
      ) : null}
    </div>
  );
}

// ---------- The whole sender ----------

export function WhatsAppSender({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [fill, setFill] = useState<CampaignFillSlot[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [group, setGroup] = useState<CampaignGroup>("noAddress");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planning, setPlanning] = useState(false);

  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/insiders/whatsapp/templates").catch(
        () => null,
      );
      const data = (await response?.json().catch(() => null)) as {
        ok: boolean;
        error?: string;
        templates?: Template[];
      } | null;
      if (cancelled) return;
      if (!data?.ok) {
        setListError(
          data?.error ?? "Couldn't load the templates. Reload to try again.",
        );
        return;
      }
      setTemplates(data.templates ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const audience = useMemo(
    () => ({
      group,
      ...(group === "joined"
        ? { from: from || undefined, to: to || undefined }
        : {}),
      ...(group === "picked" ? { ids: picked.map((p) => p.id) } : {}),
    }),
    [group, from, to, picked],
  );
  const needsCode = fill.some((s) => s.kind === "insiderCode");
  const planKey = template
    ? JSON.stringify({ audience, name: template.name, needsCode, allowRepeat })
    : null;

  // Counts who will get it, a moment after anything changes.
  useEffect(() => {
    if (!planKey) return;
    const timer = setTimeout(async () => {
      if (group === "picked" && picked.length === 0) {
        setPlan(null);
        return;
      }
      setPlanning(true);
      const parsed = JSON.parse(planKey) as {
        audience: unknown;
        name: string;
        needsCode: boolean;
        allowRepeat: boolean;
      };
      const data = await postJson<Plan>("/api/insiders/whatsapp/plan", {
        audience: parsed.audience,
        templateName: parsed.name,
        needsCode: parsed.needsCode,
        allowRepeat: parsed.allowRepeat,
      });
      setPlanning(false);
      setPlan(data.ok ? (data as unknown as Plan) : null);
    }, 350);
    return () => clearTimeout(timer);
  }, [planKey, group, picked.length]);

  // Warn before leaving while a send is running.
  const running = progress?.running ?? false;
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  function pickTemplate(next: Template) {
    if (running) return;
    setTemplate(next);
    setFill(next.suggestedFill);
    setImageUrl(next.header === "IMAGE" ? next.sampleImageUrl : null);
    setAllowRepeat(false);
    setPlan(null);
  }

  const problem = template
    ? checkCampaignFill(template, fill, imageUrl)
    : "Pick a template first.";
  const audienceProblem =
    group === "picked" && picked.length === 0
      ? "Pick at least one person."
      : null;
  const canSend =
    canManage &&
    !problem &&
    !audienceProblem &&
    !running &&
    !planning &&
    (plan?.willGet ?? 0) > 0;

  async function sendTest() {
    if (!template || problem) return;
    setTesting(true);
    const result = await postJson("/api/insiders/whatsapp/test", {
      templateId: template.id,
      fill,
      headerImageUrl: imageUrl,
      phone: testPhone,
    });
    setTesting(false);
    if (!result.ok) {
      toast(result.error ?? "The test didn't send. Try again.", "error");
      return;
    }
    toast("Test sent. Check the phone.", "success");
  }

  async function sendAll() {
    if (!template || !plan) return;
    const ok = await confirm({
      title: `Send “${template.name}” to ${plural(plan.willGet, "person", "people")}?`,
      message: `Each person gets their own name, code and link filled in. This can't be undone once it's sent. ${
        template.category === "MARKETING"
          ? "This is a marketing template, so WhatsApp charges the marketing rate."
          : ""
      }`,
      confirmLabel: "Send now",
    });
    if (!ok) return;

    const started = await postJson<{ id: string; ids: string[] }>(
      "/api/insiders/whatsapp/campaigns",
      {
        templateId: template.id,
        fill,
        headerImageUrl: imageUrl,
        audience,
        allowRepeat,
      },
    );
    if (!started.ok || !started.id || !started.ids) {
      toast(started.error ?? "The send didn't start. Try again.", "error");
      return;
    }

    const ids = started.ids;
    stopRef.current = false;
    const tally: Progress = {
      total: ids.length,
      done: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      running: true,
      stopped: false,
    };
    setProgress({ ...tally });
    for (let i = 0; i < ids.length; i += CAMPAIGN_BATCH_SIZE) {
      if (stopRef.current) {
        tally.stopped = true;
        break;
      }
      const batch = ids.slice(i, i + CAMPAIGN_BATCH_SIZE);
      const result = await postJson<{
        sent: number;
        failed: number;
        skipped: number;
      }>(`/api/insiders/whatsapp/campaigns/${started.id}/send`, { ids: batch });
      if (result.ok) {
        tally.sent += result.sent ?? 0;
        tally.failed += result.failed ?? 0;
        tally.skipped += result.skipped ?? 0;
      } else {
        tally.failed += batch.length;
      }
      tally.done += batch.length;
      setProgress({ ...tally });
    }
    tally.running = false;
    setProgress({ ...tally });
    toast(
      `${tally.stopped ? "Stopped. " : ""}Sent ${tally.sent}${
        tally.failed ? `, ${tally.failed} didn't go out` : ""
      }${tally.skipped ? `, ${tally.skipped} skipped` : ""}.`,
      tally.failed ? "error" : "success",
    );
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Step
          n={1}
          title="Pick a template"
          hint="Approved utility and marketing templates from Gupshup."
          done={Boolean(template)}
        >
          <TemplatePicker
            templates={templates}
            error={listError}
            chosenId={template?.id ?? null}
            onPick={pickTemplate}
          />
        </Step>

        {template ? (
          <Step
            n={2}
            title="Fill in the blanks"
            hint="Choose what goes in each blank. Each person gets their own name, code and link."
            done={!problem}
          >
            <FillEditor
              template={template}
              fill={fill}
              onChange={setFill}
              imageUrl={imageUrl}
              onImage={setImageUrl}
              disabled={running}
            />
          </Step>
        ) : null}

        {template ? (
          <Step
            n={3}
            title="Choose who gets it"
            hint="People who replied STOP or unsubscribed are always left out."
            done={(plan?.willGet ?? 0) > 0}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_GROUPS.map((id) => (
                  <Pill
                    key={id}
                    active={group === id}
                    onClick={() => !running && setGroup(id)}
                  >
                    {CAMPAIGN_GROUP_LABELS[id]}
                  </Pill>
                ))}
              </div>
              {group === "joined" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="From">
                    <AdminInput
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </Field>
                  <Field label="To">
                    <AdminInput
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
              {group === "picked" ? (
                <PeoplePicker picked={picked} onChange={setPicked} />
              ) : null}
              <PlanSummary
                plan={audienceProblem ? null : plan}
                loading={planning}
                allowRepeat={allowRepeat}
                onAllowRepeat={setAllowRepeat}
              />
            </div>
          </Step>
        ) : null}

        {template ? (
          <Step n={4} title="Check and send">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field
                  label="Send a test to"
                  hint="Uses the sample values from the preview (Priya, WEI4821)."
                  className="sm:flex-1"
                >
                  <AdminInput
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    inputMode="tel"
                  />
                </Field>
                <AdminButton
                  variant="secondary"
                  onClick={sendTest}
                  disabled={
                    !canManage ||
                    testing ||
                    Boolean(problem) ||
                    !testPhone.trim()
                  }
                  className="sm:mb-6"
                >
                  {testing ? "Sending..." : "Send test"}
                </AdminButton>
              </div>

              {progress ? (
                <div className="flex flex-col gap-2 rounded-2xl bg-onwei-beige/60 p-4">
                  <div className="flex items-center justify-between text-sm text-onwei-blue">
                    <span>
                      {progress.running
                        ? `Sending ${progress.done} of ${progress.total}...`
                        : progress.stopped
                          ? `Stopped after ${progress.done} of ${progress.total}`
                          : `Done: ${progress.total} processed`}
                    </span>
                    <span className="text-onwei-blue/70">
                      {progress.sent} sent
                      {progress.failed ? ` · ${progress.failed} failed` : ""}
                      {progress.skipped ? ` · ${progress.skipped} skipped` : ""}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-onwei-white">
                    <div
                      className="h-full rounded-full bg-onwei-blue transition-all"
                      style={{
                        width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {progress.running ? (
                    <p className="text-xs text-onwei-blue/70">
                      Keep this page open until it finishes.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                {running ? (
                  <AdminButton
                    variant="danger"
                    onClick={() => {
                      stopRef.current = true;
                    }}
                  >
                    Stop
                  </AdminButton>
                ) : (
                  <AdminButton onClick={sendAll} disabled={!canSend}>
                    {plan && plan.willGet > 0
                      ? `Send to ${plural(plan.willGet, "person", "people")}`
                      : "Send"}
                  </AdminButton>
                )}
                {!running && (problem ?? audienceProblem) ? (
                  <span className="text-sm text-onwei-blue/70">
                    {problem ?? audienceProblem}
                  </span>
                ) : null}
                {!canManage ? (
                  <span className="text-sm text-onwei-blue/70">
                    Ask someone who can manage Insiders to send this.
                  </span>
                ) : null}
              </div>
            </div>
          </Step>
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-3 text-center text-xs uppercase tracking-wide text-onwei-blue/60">
          Preview with sample values
        </p>
        <PhonePreview template={template} fill={fill} imageUrl={imageUrl} />
      </aside>
    </div>
  );
}
