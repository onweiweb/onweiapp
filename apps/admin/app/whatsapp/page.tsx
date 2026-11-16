import {
  WHATSAPP_PURPOSE_LIST,
  countWhatsAppOptOuts,
  getWhatsAppStats,
  listWhatsAppTemplates,
  missingGupshupSettings,
  type WhatsAppTemplateView,
} from "@onwei/core";
import { hasPermission } from "@onwei/auth";
import {
  AdminBadge,
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  PageHeader,
  type StatusTone,
} from "../_components/ui";
import { requirePageSession } from "../_lib/requirePageSession";
import { WhatsAppRowActions } from "./_components";
import { cachedGupshupTemplates } from "./_gupshup";

/** What Gupshup says about a saved template's approval at Meta. */
function approvalOf(
  templateId: string,
  list: Awaited<ReturnType<typeof cachedGupshupTemplates>>,
): string | null {
  if (!templateId) return null;
  if (!list.ok) return "Approval: couldn't check Gupshup";
  const found = list.templates.find((t) => t.id === templateId);
  if (!found) return "Approval: not found in Gupshup";
  if (found.status === "APPROVED") return "Approved by WhatsApp";
  if (found.status === "PENDING") return "Waiting for WhatsApp approval";
  return `WhatsApp: ${found.status.toLowerCase()}${found.reason ? ` (${found.reason})` : ""}`;
}

const STATS_DAYS = 7;

function statusOf(template: WhatsAppTemplateView): {
  label: string;
  tone: StatusTone;
} {
  const needsImage =
    template.headerType === "IMAGE" && !template.headerImageUrl;
  if (!template.gupshupTemplateId || needsImage) {
    return { label: "Needs setup", tone: "problem" };
  }
  return template.isActive
    ? { label: "On", tone: "success" }
    : { label: "Off", tone: "pending" };
}

export default async function WhatsAppPage() {
  const staff = await requirePageSession("settings:view");
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
        description="Messages Onwei sends on WhatsApp through Gupshup. For each one, pick its template from Gupshup, send a test, then switch it on once WhatsApp has approved it."
      />

      <AdminCard className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-sm text-onwei-blue/80">
        {missing.length === 0 ? (
          <AdminBadge tone="success">Connected</AdminBadge>
        ) : (
          <AdminBadge tone="problem">Not connected</AdminBadge>
        )}
        {missing.length > 0 ? (
          <span>Missing settings: {missing.join(", ")}.</span>
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
            const status = statusOf(template);
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
                  {approvalOf(template.gupshupTemplateId, gupshupList) ? (
                    <p className="mt-1 text-xs text-onwei-blue/60">
                      {approvalOf(template.gupshupTemplateId, gupshupList)}
                    </p>
                  ) : null}
                </AdminTableCell>
                <AdminTableCell>
                  <p>
                    {stat.total} sent · {delivered} delivered ·{" "}
                    {stat.byStatus.FAILED} failed
                  </p>
                  {stat.topFailures[0] ? (
                    <p className="text-xs text-onwei-blue/60">
                      Most common problem: {stat.topFailures[0].reason}
                    </p>
                  ) : null}
                </AdminTableCell>
                <AdminTableCell>
                  <WhatsAppRowActions
                    info={info}
                    template={template}
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
