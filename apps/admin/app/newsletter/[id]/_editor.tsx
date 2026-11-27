"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { HtmlBodyField } from "../../_components/HtmlBodyField";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminInput,
  Field,
  useConfirm,
  useToast,
} from "../../_components/ui";

interface IssueData {
  id: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  includeUnconfirmed: boolean;
  status: "DRAFT" | "SENDING" | "SENT";
  sent: number;
  failed: number;
}

type Reply = { ok: boolean; error?: string; message?: string } & Record<
  string,
  unknown
>;

async function call(
  url: string,
  method: string,
  body?: unknown,
): Promise<Reply> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await response.json()) as Reply;
  } catch {
    return {
      ok: false,
      error: "Something went wrong. Check your connection and try again.",
    };
  }
}

const DAILY_DEFAULT = 100;

export function NewsletterEditor({
  issue,
  canManage,
  remaining,
  withoutOptIn,
}: {
  issue: IssueData | null;
  canManage: boolean;
  remaining: number;
  withoutOptIn: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const start = {
    subject: issue?.subject ?? "",
    preheader: issue?.preheader ?? "",
    bodyHtml: issue?.bodyHtml ?? "",
    includeUnconfirmed: issue?.includeUnconfirmed ?? false,
  };
  const [values, setValues] = useState(start);
  const [baseline, setBaseline] = useState(() => JSON.stringify(start));
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(String(DAILY_DEFAULT));
  const [progress, setProgress] = useState<string | null>(null);
  const stop = useRef(false);
  const editable = canManage && (!issue || issue.status === "DRAFT");
  const dirty = JSON.stringify(values) !== baseline;

  async function save(): Promise<string | null> {
    setBusy(true);
    const result = await call("/api/newsletter/issues", "POST", {
      id: issue?.id ?? null,
      ...values,
    });
    setBusy(false);
    if (!result.ok || typeof result.id !== "string") {
      toast(result.error ?? "It didn't save. Try again.", "error");
      return null;
    }
    setBaseline(JSON.stringify(values));
    toast("Saved.", "success");
    if (!issue) router.replace(`/newsletter/${result.id}`);
    else router.refresh();
    return result.id;
  }

  async function test() {
    if (!issue) return;
    setBusy(true);
    const result = await call(
      `/api/newsletter/issues/${issue.id}/test`,
      "POST",
    );
    setBusy(false);
    toast(
      result.ok
        ? (result.message ?? "Test sent.")
        : (result.error ?? "It didn't send."),
      result.ok ? "success" : "error",
    );
  }

  async function remove() {
    if (!issue) return;
    const ok = await confirm({
      title: "Delete this draft?",
      message: "It hasn't been sent to anyone. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const result = await call(`/api/newsletter/issues/${issue.id}`, "DELETE");
    if (!result.ok) return toast(result.error ?? "It didn't delete.", "error");
    toast("Draft deleted.", "success");
    router.push("/newsletter");
  }

  async function send() {
    if (!issue) return;
    const max = Math.max(1, Math.min(Number(limit) || DAILY_DEFAULT, 1000));
    const ok = await confirm({
      title: `Send "${issue.subject}"?`,
      message: `It goes to up to ${Math.min(max, remaining)} of the ${remaining} people still waiting for it now. You can't edit it after this.`,
      confirmLabel: "Send",
    });
    if (!ok) return;
    stop.current = false;
    setBusy(true);
    let sentNow = 0;
    let failedNow = 0;
    let left = remaining;
    while (!stop.current && sentNow + failedNow < max && left > 0) {
      const result = await call(
        `/api/newsletter/issues/${issue.id}/send`,
        "POST",
        {
          max: Math.min(20, max - sentNow - failedNow),
        },
      );
      if (!result.ok) {
        toast(result.error ?? "Sending stopped. Try again.", "error");
        break;
      }
      const sent = Number(result.sent ?? 0);
      const failed = Number(result.failed ?? 0);
      sentNow += sent;
      failedNow += failed;
      left = Number(result.remaining ?? 0);
      setProgress(
        `Sent ${sentNow}${failedNow ? `, ${failedNow} failed` : ""}. ${left} still to go.`,
      );
      if (sent + failed === 0) break;
    }
    setBusy(false);
    toast(
      left === 0
        ? `Done. Sent to ${sentNow} people.`
        : `Sent to ${sentNow} people today. ${left} still to go: press Send again tomorrow.`,
      "success",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {issue && issue.status !== "DRAFT" ? (
        <AdminCard className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={issue.status === "SENT" ? "success" : "active"}>
              {issue.status === "SENT" ? "Sent" : "Sending"}
            </AdminBadge>
            <span className="text-sm text-onwei-blue/80">
              Sent to {issue.sent}
              {issue.failed ? `, ${issue.failed} failed` : ""}.
              {issue.status === "SENDING" ? ` ${remaining} still to go.` : ""}
            </span>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard className="flex flex-col gap-4">
        <Field label="Subject" hint="What people see in their inbox.">
          <AdminInput
            value={values.subject}
            disabled={!editable}
            maxLength={150}
            onChange={(e) =>
              setValues((v) => ({ ...v, subject: e.target.value }))
            }
          />
        </Field>
        <Field
          label="Preview line"
          hint="The short line most inboxes show after the subject."
        >
          <AdminInput
            value={values.preheader}
            disabled={!editable}
            maxLength={200}
            onChange={(e) =>
              setValues((v) => ({ ...v, preheader: e.target.value }))
            }
          />
        </Field>
        <HtmlBodyField
          label="Newsletter"
          value={values.bodyHtml}
          disabled={!editable}
          imageUploadUrl={editable ? "/api/newsletter/image" : undefined}
          placeholder="Write the newsletter here. Select some text and use a button above to format it."
          onChange={(bodyHtml) => setValues((v) => ({ ...v, bodyHtml }))}
        />
        <label className="flex items-start gap-2 text-sm text-onwei-blue">
          <input
            type="checkbox"
            className="mt-1"
            checked={values.includeUnconfirmed}
            disabled={!editable}
            onChange={(e) =>
              setValues((v) => ({ ...v, includeUnconfirmed: e.target.checked }))
            }
          />
          <span>
            Also send to people added without a recorded opt-in ({withoutOptIn}
            ). These signed up before the consent checkbox existed, or were
            added by staff. Leave this off unless you know they agreed to
            emails.
          </span>
        </label>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <AdminButton type="button" disabled={busy || !dirty} onClick={save}>
              {busy ? "Saving..." : "Save"}
            </AdminButton>
            {issue ? (
              <>
                <AdminButton
                  type="button"
                  variant="secondary"
                  disabled={busy || dirty}
                  onClick={test}
                >
                  Send me a test
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={remove}
                >
                  Delete draft
                </AdminButton>
              </>
            ) : null}
          </div>
        ) : null}
        {dirty && issue ? (
          <p className="text-xs text-onwei-blue/70">
            Save your changes before sending a test or sending it out.
          </p>
        ) : null}
      </AdminCard>

      {canManage && issue && issue.status !== "SENT" ? (
        <AdminCard className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-onwei-blue">Send it</h2>
          <p className="text-sm text-onwei-blue/80">
            {remaining === 0
              ? "Nobody is waiting for this newsletter."
              : `${remaining} ${remaining === 1 ? "person is" : "people are"} waiting for it.`}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field
              label="Send to at most (today)"
              hint="Sign-in codes and order emails count towards the same daily limit."
            >
              <AdminInput
                value={limit}
                inputMode="numeric"
                className="w-32"
                onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <AdminButton
              type="button"
              disabled={busy || dirty || remaining === 0}
              onClick={send}
            >
              {busy && progress ? "Sending..." : "Send"}
            </AdminButton>
            {busy && progress ? (
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => {
                  stop.current = true;
                }}
              >
                Stop
              </AdminButton>
            ) : null}
          </div>
          {progress ? (
            <p className="text-sm text-onwei-blue/80" role="status">
              {progress}
            </p>
          ) : null}
        </AdminCard>
      ) : null}
    </div>
  );
}
