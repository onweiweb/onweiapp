"use client";

import type { InsiderPickRow } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminDialog,
  AdminInput,
  Field,
  useConfirm,
  useToast,
} from "../_components/ui";

const MAX = 10;
const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

type Picked = Pick<InsiderPickRow, "id" | "fullName" | "email" | "emailedAt">;

async function post(body: unknown) {
  const response = await fetch("/api/insiders/email/selected", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return ((await response?.json().catch(() => null)) ?? { ok: false }) as {
    ok: boolean;
    error?: string;
    needsResend?: boolean;
    sent?: number;
    failed?: number;
    skipped?: number;
    whatsappSent?: number;
    whatsappFailed?: number;
  };
}

function Picker({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [found, setRows] = useState<InsiderPickRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [sending, setSending] = useState(false);

  // Search as staff type, a moment after they stop.
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
      setRows(data?.ok ? (data.rows ?? []) : []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Old results stay in state, but only show while there is a search.
  const rows = query.trim().length < 2 ? [] : found;

  function toggle(row: InsiderPickRow) {
    setPicked((list) =>
      list.some((p) => p.id === row.id)
        ? list.filter((p) => p.id !== row.id)
        : list.length >= MAX
          ? list
          : [...list, row],
    );
  }

  async function sendNow() {
    const repeat = picked.filter((p) => p.emailedAt).length;
    const ok = await confirm({
      title: `Email ${picked.length} chosen Insider${picked.length > 1 ? "s" : ""} now?`,
      message: `Each person gets their own real code and address link, plus the Insider WhatsApp if they have a phone and it's switched on. They won't get it again in the bulk send.${repeat > 0 ? ` ${repeat} of them already got it and will get it again.` : ""}`,
      confirmLabel: "Send",
    });
    if (!ok) return;
    setSending(true);
    const result = await post({
      ids: picked.map((p) => p.id),
      resend: repeat > 0,
    });
    setSending(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't send. Try again.", "error");
      return;
    }
    const whatsapp =
      (result.whatsappSent ?? 0) + (result.whatsappFailed ?? 0) > 0
        ? ` WhatsApp: ${result.whatsappSent ?? 0} sent${result.whatsappFailed ? `, ${result.whatsappFailed} didn't go out` : ""}.`
        : "";
    const skipped = result.skipped
      ? ` ${result.skipped} skipped (unsubscribed or no code).`
      : "";
    toast(
      `Sent ${result.sent ?? 0} email${result.sent === 1 ? "" : "s"}${result.failed ? `, ${result.failed} didn't go out` : ""}.${whatsapp}${skipped}`,
      result.failed || result.whatsappFailed ? "error" : "success",
    );
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Find Insiders"
        hint="Type a name, email or Insider code. Pick up to 10. These count towards the 100 emails a day."
      >
        <AdminInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Sakshi, or WEI6615"
          autoFocus
        />
      </Field>

      {picked.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {picked.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                setPicked((list) => list.filter((x) => x.id !== p.id))
              }
              className="rounded-full bg-onwei-purple/20 px-3 py-1 text-sm text-onwei-blue"
              title="Remove"
            >
              {p.fullName} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex max-h-72 flex-col divide-y divide-onwei-beige overflow-y-auto rounded border border-onwei-beige">
        {query.trim().length < 2 ? (
          <p className="p-3 text-sm text-onwei-blue/60">
            Start typing to search.
          </p>
        ) : searching && rows.length === 0 ? (
          <p className="p-3 text-sm text-onwei-blue/60">Searching...</p>
        ) : rows.length === 0 ? (
          <p className="p-3 text-sm text-onwei-blue/60">Nobody matches that.</p>
        ) : (
          rows.map((row) => {
            const isPicked = picked.some((p) => p.id === row.id);
            const full = !isPicked && picked.length >= MAX;
            return (
              <label
                key={row.id}
                className={`flex items-start gap-3 p-3 text-sm ${row.blocked || full ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={isPicked}
                  disabled={Boolean(row.blocked) || full}
                  onChange={() => toggle(row)}
                  className="mt-1"
                />
                <span className="flex flex-col">
                  <span className="font-medium text-onwei-blue">
                    {row.fullName} · {row.insiderCode ?? "no code"}
                  </span>
                  <span className="text-onwei-blue/70">{row.email}</span>
                  <span className="text-xs text-onwei-blue/60">
                    {row.blocked === "UNSUBSCRIBED"
                      ? "Unsubscribed, can't be emailed"
                      : row.blocked === "NO_CODE"
                        ? "No code yet, create codes on the Overview tab"
                        : [
                            row.emailedAt
                              ? `Already emailed ${DATE.format(new Date(row.emailedAt))}`
                              : "Not emailed yet",
                            row.hasPhone ? "has a phone for WhatsApp" : null,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      <div className="flex justify-end gap-2">
        <AdminButton type="button" variant="secondary" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton
          type="button"
          onClick={sendNow}
          disabled={picked.length === 0 || sending}
        >
          {sending
            ? "Sending..."
            : `Send to ${picked.length || ""} chosen`.replace("  ", " ")}
        </AdminButton>
      </div>
    </div>
  );
}

/** "Send to chosen Insiders": the real email to a few people, to check it. */
export function ChooseInsidersButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AdminButton
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Send to chosen Insiders
      </AdminButton>
      <AdminDialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Send to chosen Insiders"
        description="Send the real email to a few people first, with their own name, code and links, to check everything comes through right."
      >
        {open ? <Picker onDone={() => setOpen(false)} /> : null}
      </AdminDialog>
    </>
  );
}
