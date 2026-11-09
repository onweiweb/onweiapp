"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  Field,
  useConfirm,
  useToast,
} from "../_components/ui";

async function send(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; error?: string } & Record<string, unknown>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await response.json()) as { ok: boolean; error?: string };
  } catch {
    return {
      ok: false,
      error: "Something went wrong. Check your connection and try again.",
    };
  }
}

/** Default Insider % with Save kept off until the number changes. */
export function DefaultPercentForm({ initial }: { initial: number }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(String(initial));
  const [baseline, setBaseline] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await send("/api/insiders/default-percent", "PATCH", {
      percent: Number(value),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "That didn't save. Try again.");
      return;
    }
    setBaseline(value);
    toast("Insider discount saved.", "success");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-start gap-3">
      <Field
        label="Insider discount (%)"
        hint="Every Insider gets this, unless their signup date falls in a tier below."
        error={error}
        className="w-72"
      >
        <AdminInput
          type="number"
          min={1}
          max={90}
          step={1}
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <AdminButton
        type="submit"
        className="mt-[1.6rem]"
        disabled={saving || value === baseline}
      >
        {saving ? "Saving..." : "Save"}
      </AdminButton>
    </form>
  );
}

export interface TierRow {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  percent: number;
}

const EMPTY_TIER = { label: "", startDate: "", endDate: "", percent: "" };

/** Add or edit one tier. `tier` set means edit. */
export function TierForm({
  tier,
  onDone,
}: {
  tier?: TierRow;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const start = tier ? { ...tier, percent: String(tier.percent) } : EMPTY_TIER;
  const [values, setValues] = useState(start);
  const [baseline, setBaseline] = useState(JSON.stringify(start));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = { ...values, percent: Number(values.percent) };
    const result = tier
      ? await send(`/api/insiders/tiers/${tier.id}`, "PATCH", body)
      : await send("/api/insiders/tiers", "POST", body);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "That didn't save. Try again.");
      return;
    }
    toast(tier ? "Tier updated." : "Tier added.", "success");
    if (tier) setBaseline(JSON.stringify(values));
    else setValues(EMPTY_TIER);
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Name" hint='For you only, e.g. "First week".'>
          <AdminInput
            value={values.label}
            maxLength={60}
            onChange={(event) =>
              setValues({ ...values, label: event.target.value })
            }
          />
        </Field>
        <Field label="Signed up from">
          <AdminInput
            type="date"
            value={values.startDate}
            onChange={(event) =>
              setValues({ ...values, startDate: event.target.value })
            }
          />
        </Field>
        <Field label="Signed up until" hint="This day counts too.">
          <AdminInput
            type="date"
            value={values.endDate}
            onChange={(event) =>
              setValues({ ...values, endDate: event.target.value })
            }
          />
        </Field>
        <Field label="Discount (%)">
          <AdminInput
            type="number"
            min={1}
            max={90}
            step={1}
            inputMode="numeric"
            value={values.percent}
            onChange={(event) =>
              setValues({ ...values, percent: event.target.value })
            }
          />
        </Field>
      </div>
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      <div className="flex gap-2">
        <AdminButton type="submit" disabled={saving || !dirty}>
          {saving ? "Saving..." : tier ? "Save tier" : "Add tier"}
        </AdminButton>
        {onDone && tier ? (
          <AdminButton type="button" variant="secondary" onClick={onDone}>
            Cancel
          </AdminButton>
        ) : null}
      </div>
    </form>
  );
}

export function TierActions({ tier }: { tier: TierRow }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  async function remove() {
    const ok = await confirm({
      title: `Remove "${tier.label}"?`,
      message: `Insiders who signed up in these dates go back to the default discount from now on. Past orders keep what they got.`,
      confirmLabel: "Remove tier",
      danger: true,
    });
    if (!ok) return;
    const result = await send(`/api/insiders/tiers/${tier.id}`, "DELETE");
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast("Tier removed.", "success");
    router.refresh();
  }

  if (editing) {
    return (
      <AdminCard className="mt-2">
        <TierForm tier={tier} onDone={() => setEditing(false)} />
      </AdminCard>
    );
  }
  return (
    <div className="flex gap-2">
      <AdminButton
        type="button"
        variant="secondary"
        onClick={() => setEditing(true)}
      >
        Edit
      </AdminButton>
      <AdminButton type="button" variant="secondary" onClick={remove}>
        Remove
      </AdminButton>
    </div>
  );
}

export function CreateCodesButton({ missing }: { missing: number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const result = await send("/api/insiders/codes", "POST");
    setBusy(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast(`Created ${String(result.created)} codes.`, "success");
    router.refresh();
  }

  return (
    <AdminButton type="button" onClick={run} disabled={busy || missing === 0}>
      {busy ? "Creating..." : `Create ${missing} missing codes`}
    </AdminButton>
  );
}

export function PostedToggle({ id, posted }: { id: string; posted: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const result = await send(`/api/insiders/addresses/${id}`, "PATCH", {
      posted: !posted,
    });
    setBusy(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    router.refresh();
  }

  return (
    <AdminButton
      type="button"
      variant={posted ? "secondary" : "primary"}
      onClick={toggle}
      disabled={busy}
    >
      {posted ? "Undo posted" : "Mark posted"}
    </AdminButton>
  );
}

/**
 * Test send, then the real send in batches until nobody is left. Shows
 * progress as it goes; stopping the page midway is safe (nobody is emailed
 * twice, the rest go out on the next press).
 */
// Resend's free plan allows 100 emails a day, so a big list goes out over
// a few days: send up to the day's number, then press again tomorrow.
const DAILY_DEFAULT = 100;

export function EmailSender({ toEmail }: { toEmail: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [limit, setLimit] = useState(String(Math.min(DAILY_DEFAULT, toEmail)));
  const [progress, setProgress] = useState<{
    sent: number;
    failed: number;
  } | null>(null);
  const howMany = Math.max(0, Math.min(Number(limit) || 0, toEmail));

  async function sendTest() {
    setTesting(true);
    const result = await send("/api/insiders/email/test", "POST");
    setTesting(false);
    if (!result.ok) {
      toast(result.error ?? "The test email didn't go out.", "error");
      return;
    }
    toast(`Test email sent to ${String(result.sentTo)}.`, "success");
  }

  async function sendAll() {
    const left = toEmail - howMany;
    const ok = await confirm({
      title: `Email ${howMany} Insiders now?`,
      message: `Each person gets their own code and address link. This can't be taken back once sent.${left > 0 ? ` ${left} will still be waiting; send them another day.` : ""} Did the test email look right?`,
      confirmLabel: `Send to ${howMany} people`,
    });
    if (!ok) return;

    setSending(true);
    let sent = 0;
    let failed = 0;
    setProgress({ sent, failed });
    while (sent < howMany) {
      const result = await send("/api/insiders/email/send", "POST", {
        max: Math.min(20, howMany - sent),
      });
      if (!result.ok) {
        toast(
          result.error ?? "Sending stopped. Press send again to carry on.",
          "error",
        );
        break;
      }
      sent += Number(result.sent);
      failed += Number(result.failed);
      setProgress({ sent, failed });
      // Stop when nobody is left, or a whole batch failed (provider problem,
      // often the day's limit).
      if (Number(result.remaining) === 0 || Number(result.sent) === 0) break;
    }
    setSending(false);
    toast(
      failed > 0
        ? `Sent ${sent}. ${failed} didn't go out (the day's limit may be reached); they'll go with the next send.`
        : `Sent ${sent} emails.`,
      failed > 0 ? "error" : "success",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <AdminButton
          type="button"
          variant="secondary"
          onClick={sendTest}
          disabled={testing || sending}
        >
          {testing ? "Sending test..." : "Send me a test first"}
        </AdminButton>
        <Field
          label="How many to send now"
          hint="100 a day on the free email plan. Sign-in codes count too."
          className="w-56"
        >
          <AdminInput
            type="number"
            min={1}
            max={toEmail}
            value={limit}
            disabled={sending}
            onChange={(e) => setLimit(e.target.value)}
          />
        </Field>
        <AdminButton
          type="button"
          onClick={sendAll}
          disabled={sending || howMany === 0}
        >
          {sending ? "Sending..." : `Email codes to ${howMany} Insiders`}
        </AdminButton>
      </div>
      {progress ? (
        <p role="status" className="text-sm text-onwei-blue/80">
          {sending ? "Sending... " : ""}
          {progress.sent} sent
          {progress.failed > 0 ? `, ${progress.failed} didn't go out` : ""}.
          {sending ? " Keep this page open." : ""}
        </p>
      ) : null}
    </div>
  );
}
