"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminBadge,
  AdminButton,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  useConfirm,
  useToast,
} from "../_components/ui";

export interface ApplicationRowView {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  activity: string | null;
  joinReasons: string[];
  sessionPick: string | null;
  gearWish: string | null;
  submittedAt: string;
  status: "APPLIED" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
}

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** Open signup, or invite and apply only. */
export function JoinModeSwitch({
  mode,
  canManage,
}: {
  mode: "OPEN" | "INVITE_OR_APPLY";
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const next = mode === "OPEN" ? "INVITE_OR_APPLY" : "OPEN";

  async function flip() {
    const ok = await confirm({
      title:
        next === "INVITE_OR_APPLY"
          ? "Make Insiders invite-only?"
          : "Open Insiders to everyone again?",
      message:
        next === "INVITE_OR_APPLY"
          ? "New people get in only with an Insider's number (straight away) or by applying (you approve them here). Existing Insiders keep everything."
          : "Anyone can sign up again and gets a code straight away. Applications still waiting stay here for you to approve.",
      confirmLabel: next === "INVITE_OR_APPLY" ? "Make invite-only" : "Open it",
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch("/api/insiders/join-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      toast("That didn't save. Try again.", "error");
      return;
    }
    toast(
      next === "INVITE_OR_APPLY"
        ? "Insiders is invite-only now. The site updates within a minute."
        : "Anyone can join again. The site updates within a minute.",
      "success",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm text-onwei-blue/80">
        {mode === "OPEN"
          ? "Open: anyone can sign up on the Insiders page and gets a code straight away."
          : "Invite or apply: people get in with an Insider's number, or apply and wait for you to approve them below."}
      </p>
      {canManage ? (
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={flip}
        >
          {next === "INVITE_OR_APPLY" ? "Make invite-only" : "Open to everyone"}
        </AdminButton>
      ) : null}
    </div>
  );
}

export function ApplicationsList({
  rows,
  canManage,
}: {
  rows: ApplicationRowView[];
  /** Approve and reject (only on the waiting list). */
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const allPicked = rows.length > 0 && picked.length === rows.length;

  async function review(action: "approve" | "reject", ids: string[]) {
    const count = ids.length;
    const ok = await confirm({
      title:
        action === "approve"
          ? `Approve ${count} application${count === 1 ? "" : "s"}?`
          : `Reject ${count} application${count === 1 ? "" : "s"}?`,
      message:
        action === "approve"
          ? "Each gets their own Insider ID and the welcome email and WhatsApp. If someone let them in, that Insider's invite count goes up."
          : "They aren't told. The same mobile number can't apply again.",
      confirmLabel: action === "approve" ? "Approve" : "Reject",
      danger: action === "reject",
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch("/api/insiders/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    }).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      approved?: number;
      rejected?: number;
      skipped?: number;
      welcomeLater?: number;
    } | null;
    if (!response?.ok || !data?.ok) {
      toast(data?.error ?? "That didn't work. Try again.", "error");
      return;
    }
    const parts =
      action === "approve"
        ? [
            `${data.approved ?? 0} approved`,
            data.welcomeLater
              ? `${data.welcomeLater} will get the welcome email from Insiders > Email (daily email limit)`
              : "",
          ]
        : [`${data.rejected ?? 0} rejected`];
    if (data.skipped) parts.push(`${data.skipped} were already reviewed`);
    toast(`${parts.filter(Boolean).join(". ")}.`, "success");
    setPicked([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            disabled={busy || picked.length === 0}
            onClick={() => review("approve", picked)}
          >
            Approve {picked.length || "ticked"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy || picked.length === 0}
            onClick={() => review("reject", picked)}
          >
            Reject {picked.length || "ticked"}
          </AdminButton>
        </div>
      ) : null}
      <AdminTable>
        <AdminTableHead>
          {canManage ? (
            <AdminTableHeaderCell>
              <input
                type="checkbox"
                aria-label="Pick every application on this page"
                checked={allPicked}
                onChange={(e) =>
                  setPicked(e.target.checked ? rows.map((r) => r.id) : [])
                }
              />
            </AdminTableHeaderCell>
          ) : null}
          <AdminTableHeaderCell>Applied</AdminTableHeaderCell>
          <AdminTableHeaderCell>Name and contact</AdminTableHeaderCell>
          <AdminTableHeaderCell>Activity</AdminTableHeaderCell>
          <AdminTableHeaderCell>Why join</AdminTableHeaderCell>
          <AdminTableHeaderCell>Session and gear idea</AdminTableHeaderCell>
          <AdminTableHeaderCell>
            {canManage ? "Review" : "Status"}
          </AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {rows.map((r) => (
            <AdminTableRow key={r.id}>
              {canManage ? (
                <AdminTableCell>
                  <input
                    type="checkbox"
                    aria-label={`Pick ${r.fullName}`}
                    checked={picked.includes(r.id)}
                    onChange={(e) =>
                      setPicked((list) =>
                        e.target.checked
                          ? [...list, r.id]
                          : list.filter((id) => id !== r.id),
                      )
                    }
                  />
                </AdminTableCell>
              ) : null}
              <AdminTableCell>
                {DATE.format(new Date(r.submittedAt))}
              </AdminTableCell>
              <AdminTableCell>
                <p className="font-medium">{r.fullName}</p>
                <p className="text-xs text-onwei-blue/70">{r.email}</p>
                <p className="text-xs text-onwei-blue/70">{r.phone}</p>
              </AdminTableCell>
              <AdminTableCell>{r.activity ?? "-"}</AdminTableCell>
              <AdminTableCell>
                <span className="text-xs">{r.joinReasons.join(", ")}</span>
              </AdminTableCell>
              <AdminTableCell>
                <p className="text-xs">
                  {r.sessionPick ?? "No session picked"}
                </p>
                {r.gearWish ? (
                  <p className="text-xs text-onwei-blue/70">{r.gearWish}</p>
                ) : null}
              </AdminTableCell>
              <AdminTableCell>
                {canManage ? (
                  <div className="flex gap-2">
                    <AdminButton
                      type="button"
                      disabled={busy}
                      onClick={() => review("approve", [r.id])}
                    >
                      Approve
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => review("reject", [r.id])}
                    >
                      Reject
                    </AdminButton>
                  </div>
                ) : (
                  <AdminBadge
                    tone={
                      r.status === "APPROVED"
                        ? "success"
                        : r.status === "REJECTED"
                          ? "problem"
                          : "pending"
                    }
                  >
                    {r.status === "APPROVED"
                      ? "Approved"
                      : r.status === "REJECTED"
                        ? "Rejected"
                        : "Waiting"}
                  </AdminBadge>
                )}
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}
