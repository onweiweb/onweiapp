import Link from "next/link";
import {
  WHATSAPP_PURPOSES,
  WHATSAPP_PURPOSE_LIST,
  listWhatsAppMessages,
  countWhatsAppOptOuts,
  getWhatsAppStats,
  listWhatsAppTemplates,
  missingGupshupSettings,
  templateFitFor,
  templateFitMessage,
  type WhatsAppTemplateView,
} from "@onwei/core";
import { hasPermission } from "@onwei/auth";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPager,
  AdminSelect,
  AdminTabLinks,
  EmptyState,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  PageHeader,
  type StatusTone,
} from "../_components/ui";
import { requirePageSession } from "../_lib/requirePageSession";
import { PAGE_SIZE, parsePage } from "../_lib/pagination";
import { MESSAGE_WHEN as WHEN, after } from "../_lib/messageTiming";
import type { WhatsAppPurpose, WhatsAppStatus } from "@onwei/database";
import { WhatsAppRowActions, WhatsAppSwitch } from "./_components";
import { cachedGupshupTemplates } from "./_gupshup";

/**
 * Why the saved template can't be used now, by Gupshup's current list, or
 * null when it can (or when Gupshup couldn't be asked).
 */
function problemOf(
  template: WhatsAppTemplateView,
  list: Awaited<ReturnType<typeof cachedGupshupTemplates>>,
): string | null {
  if (!template.gupshupTemplateId || !list.ok) return null;
  const found = list.templates.find((t) => t.id === template.gupshupTemplateId);
  if (!found) return "This template isn't in Gupshup any more.";
  const fit = templateFitFor(template.purpose, found);
  if (fit === "OK") return null;
  const reason =
    fit === "NOT_APPROVED" && found.reason ? ` (${found.reason})` : "";
  return `${templateFitMessage(template.purpose, found, fit)}${reason}`;
}

const STATS_DAYS = 7;

/** Older rows kept Gupshup's "null, " in front of WhatsApp's reason. */
function cleanReason(reason: string): string {
  return reason.replace(/^null,\s*/i, "");
}

function statusOf(
  template: WhatsAppTemplateView,
  problem: string | null,
): { label: string; tone: StatusTone } {
  if (!template.gupshupTemplateId) {
    return { label: "Not set up", tone: "pending" };
  }
  if (problem) {
    return {
      label: template.isActive
        ? "On, but template no longer approved"
        : "Template no longer approved",
      tone: "problem",
    };
  }
  if (template.headerType === "IMAGE" && !template.headerImageUrl) {
    return { label: "Needs an image", tone: "problem" };
  }
  return template.isActive
    ? { label: "Sending", tone: "success" }
    : { label: "Ready, switched off", tone: "active" };
}

const TABS = [
  { id: "messages", label: "Messages" },
  { id: "log", label: "Log" },
] as const;

const STATUS_INFO: Record<WhatsAppStatus, { label: string; tone: StatusTone }> =
  {
    SENDING: { label: "Sending", tone: "pending" },
    SENT: { label: "Sent", tone: "active" },
    DELIVERED: { label: "Delivered", tone: "success" },
    READ: { label: "Read", tone: "success" },
    FAILED: { label: "Failed", tone: "problem" },
  };

type SearchParams = {
  tab?: string;
  page?: string;
  purpose?: string;
  status?: string;
  phone?: string;
};

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const staff = await requirePageSession("settings:view");
  const params = await searchParams;
  const tab = params.tab === "log" ? "log" : "messages";
  if (tab === "log") {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader
          title="WhatsApp"
          description="Every WhatsApp message Onwei sent and how far it got. Numbers are partly hidden."
        />
        <AdminTabLinks basePath="/whatsapp" tabs={TABS} active={tab} />
        <LogTab params={params} />
      </main>
    );
  }
  const canManage = hasPermission(staff.permissions, "settings:manage");
  const [templates, stats, optOuts, gupshupList] = await Promise.all([
    listWhatsAppTemplates(),
    getWhatsAppStats(STATS_DAYS),
    countWhatsAppOptOuts(),
    cachedGupshupTemplates(),
  ]);
  const missing = missingGupshupSettings();
  const webhookReady = Boolean(process.env.GUPSHUP_WEBHOOK_TOKEN?.trim());

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="WhatsApp"
        description="Messages Onwei sends on WhatsApp through Gupshup. For each one: choose an approved template, send yourself a test, then switch it on."
      />
      <AdminTabLinks basePath="/whatsapp" tabs={TABS} active={tab} />

      <AdminCard className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-sm text-onwei-blue/80">
        {missing.length === 0 ? (
          <AdminBadge tone="success">Connected</AdminBadge>
        ) : (
          <AdminBadge tone="problem">Not connected</AdminBadge>
        )}
        {missing.length > 0 ? (
          <span>Missing settings: {missing.join(", ")}.</span>
        ) : null}
        {missing.length === 0 && !gupshupList.ok ? (
          <span>
            Couldn&apos;t check template approvals with Gupshup just now.
          </span>
        ) : null}
        <span>Delivery updates: {webhookReady ? "on" : "not set up"}</span>
        <span>
          {optOuts} {optOuts === 1 ? "number" : "numbers"} replied STOP (they
          only get sign-in codes)
        </span>
      </AdminCard>

      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>Message</AdminTableHeaderCell>
          <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          <AdminTableHeaderCell>Last {STATS_DAYS} days</AdminTableHeaderCell>
          <AdminTableHeaderCell>
            <span className="sr-only">Actions</span>
          </AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {WHATSAPP_PURPOSE_LIST.map((info) => {
            const template = templates.find((t) => t.purpose === info.purpose)!;
            const stat = stats.find((s) => s.purpose === info.purpose)!;
            const problem = problemOf(template, gupshupList);
            const status = statusOf(template, problem);
            const delivered = stat.byStatus.DELIVERED + stat.byStatus.READ;
            return (
              <AdminTableRow key={info.purpose}>
                <AdminTableCell>
                  <p className="font-medium">{info.title}</p>
                  <p className="text-xs text-onwei-blue/60">
                    {info.category}
                    {template.templateName ? ` · ${template.templateName}` : ""}
                  </p>
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                  {problem ? (
                    <p className="mt-1 max-w-xs whitespace-normal text-xs text-onwei-blue/70">
                      {problem}
                    </p>
                  ) : null}
                  {canManage ? (
                    <WhatsAppSwitch
                      info={info}
                      template={template}
                      problem={problem}
                    />
                  ) : null}
                </AdminTableCell>
                <AdminTableCell>
                  <p>
                    {stat.total} sent · {delivered} delivered ·{" "}
                    {stat.byStatus.FAILED} failed
                  </p>
                  {stat.topFailures[0] ? (
                    <p className="max-w-md whitespace-normal text-xs text-onwei-blue/60">
                      Most common problem:{" "}
                      {cleanReason(stat.topFailures[0].reason)}.{" "}
                      <Link
                        href={`/whatsapp?tab=log&status=FAILED&purpose=${info.purpose}`}
                        className="underline"
                      >
                        See them in the log
                      </Link>
                    </p>
                  ) : null}
                </AdminTableCell>
                <AdminTableCell>
                  <WhatsAppRowActions
                    info={info}
                    template={template}
                    problem={problem}
                    canManage={canManage}
                  />
                </AdminTableCell>
              </AdminTableRow>
            );
          })}
        </tbody>
      </AdminTable>
    </main>
  );
}

async function LogTab({ params }: { params: SearchParams }) {
  const page = parsePage(params.page);
  const purpose =
    params.purpose &&
    (params.purpose in WHATSAPP_PURPOSES || params.purpose === "CAMPAIGN")
      ? (params.purpose as WhatsAppPurpose)
      : undefined;
  const status =
    params.status && params.status in STATUS_INFO
      ? (params.status as WhatsAppStatus)
      : undefined;
  const phone = (params.phone ?? "").replace(/\D/g, "").slice(-10);
  const { rows, hasNext } = await listWhatsAppMessages({
    page,
    pageSize: PAGE_SIZE,
    purpose,
    status,
    phoneEnding: phone || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <AdminCard className="flex flex-col gap-3 py-4">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tab" value="log" />
          <label className="flex flex-col gap-1 text-sm">
            Message
            <AdminSelect name="purpose" defaultValue={purpose ?? ""}>
              <option value="">All messages</option>
              {WHATSAPP_PURPOSE_LIST.map((info) => (
                <option key={info.purpose} value={info.purpose}>
                  {info.title}
                </option>
              ))}
              <option value="CAMPAIGN">Sent from Insiders</option>
            </AdminSelect>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Status
            <AdminSelect name="status" defaultValue={status ?? ""}>
              <option value="">Any status</option>
              {Object.entries(STATUS_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Number ends with
            <AdminInput
              name="phone"
              defaultValue={phone}
              inputMode="numeric"
              placeholder="e.g. 3210"
              className="w-36"
            />
          </label>
          <AdminButton type="submit" variant="secondary">
            Filter
          </AdminButton>
        </form>
        <p className="text-xs text-onwei-blue/70">
          <strong>Sending</strong>: being handed to Gupshup.{" "}
          <strong>Sent</strong>: Gupshup accepted it. <strong>Delivered</strong>
          : it reached the phone. <strong>Read</strong>: they opened it.{" "}
          <strong>Failed</strong>: it didn&apos;t go out, the reason is
          WhatsApp&apos;s own. Stuck on Sent for hours usually means the phone
          is off, or delivery updates aren&apos;t reaching us.
        </p>
      </AdminCard>

      {rows.length === 0 ? (
        <EmptyState
          title="No messages here"
          description={
            purpose || status || phone
              ? "Nothing matches these filters."
              : "Once Onwei sends a WhatsApp, it shows up here."
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>When</AdminTableHeaderCell>
            <AdminTableHeaderCell>Message</AdminTableHeaderCell>
            <AdminTableHeaderCell>To</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {rows.map((row) => {
              const info = STATUS_INFO[row.status];
              const timing =
                row.status === "READ"
                  ? after(row.createdAt, row.readAt)
                  : row.status === "DELIVERED"
                    ? after(row.createdAt, row.deliveredAt)
                    : row.status === "FAILED"
                      ? after(row.createdAt, row.failedAt)
                      : null;
              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell className="whitespace-nowrap">
                    {WHEN.format(row.createdAt)}
                  </AdminTableCell>
                  <AdminTableCell>
                    {row.purpose === "CAMPAIGN"
                      ? `Insiders send: ${row.templateName ?? "template"}`
                      : WHATSAPP_PURPOSES[row.purpose].title}
                  </AdminTableCell>
                  <AdminTableCell>
                    <p>{row.name ?? "Test send or not linked"}</p>
                    <p className="text-xs text-onwei-blue/60">{row.phone}</p>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-sm">
                    <AdminBadge tone={info.tone}>{info.label}</AdminBadge>
                    {timing ? (
                      <span className="ml-2 text-xs text-onwei-blue/60">
                        {timing}
                      </span>
                    ) : null}
                    {row.failureReason ? (
                      <p className="mt-1 max-w-sm whitespace-normal text-xs text-onwei-blue/70">
                        {cleanReason(row.failureReason)}
                      </p>
                    ) : null}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      <AdminPager
        pathname="/whatsapp"
        page={page}
        hasNext={hasNext}
        params={{ tab: "log", purpose, status, phone: phone || undefined }}
      />
    </div>
  );
}
