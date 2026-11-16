import {
  WHATSAPP_PURPOSE_LIST,
  countWhatsAppOptOuts,
  getWhatsAppStats,
  listWhatsAppTemplates,
  missingGupshupSettings,
} from "@onwei/core";
import { hasPermission } from "@onwei/auth";
import { AdminBadge, AdminCard, PageHeader } from "../_components/ui";
import { requirePageSession } from "../_lib/requirePageSession";
import { WhatsAppTemplateForm } from "./_components";

const STATS_DAYS = 7;

export default async function WhatsAppPage() {
  const staff = await requirePageSession("settings:view");
  const canManage = hasPermission(staff.permissions, "settings:manage");
  const [templates, stats, optOuts] = await Promise.all([
    listWhatsAppTemplates(),
    getWhatsAppStats(STATS_DAYS),
    countWhatsAppOptOuts(),
  ]);
  const missing = missingGupshupSettings();
  const webhookReady = Boolean(process.env.GUPSHUP_WEBHOOK_TOKEN?.trim());

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="WhatsApp"
        description="The WhatsApp messages Onwei sends through Gupshup. Each one needs a template approved by WhatsApp in Gupshup first, then its ID here and the switch turned on."
      />

      <AdminCard className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-onwei-blue">Connection</h2>
          {missing.length === 0 ? (
            <AdminBadge tone="success">Connected</AdminBadge>
          ) : (
            <AdminBadge tone="problem">Not connected</AdminBadge>
          )}
        </div>
        {missing.length > 0 ? (
          <p className="text-sm text-onwei-blue/80">
            Nothing is sent on WhatsApp until the developer adds these settings:{" "}
            {missing.join(", ")}. Until then, sign-in by WhatsApp stays off on
            the live shop and everything else goes by email only.
          </p>
        ) : (
          <p className="text-sm text-onwei-blue/80">
            Gupshup is connected. Messages go out once their template below is
            switched on.
          </p>
        )}
        <p className="text-sm text-onwei-blue/80">
          Delivery updates from Gupshup:{" "}
          {webhookReady
            ? "set up (the developer has the link to paste into Gupshup)."
            : "not set up yet, so messages show as sent but never as delivered or read."}
        </p>
        <p className="text-sm text-onwei-blue/80">
          {optOuts} {optOuts === 1 ? "number has" : "numbers have"} replied
          STOP. They don&apos;t get waitlist or Insider messages, only sign-in
          codes they ask for.
        </p>
      </AdminCard>

      {WHATSAPP_PURPOSE_LIST.map((info) => {
        const template = templates.find((t) => t.purpose === info.purpose)!;
        const stat = stats.find((s) => s.purpose === info.purpose)!;
        return (
          <AdminCard key={info.purpose} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-onwei-blue">
                {info.title}
              </h2>
              <AdminBadge tone={template.isActive ? "success" : "pending"}>
                {template.isActive ? "On" : "Off"}
              </AdminBadge>
            </div>
            <p className="text-sm text-onwei-blue/80">
              {info.whenSent} Approve it in Gupshup under the{" "}
              <strong>{info.category}</strong> category.
            </p>
            <p className="text-sm text-onwei-blue/80">
              Last {STATS_DAYS} days: {stat.total} sent,{" "}
              {stat.byStatus.DELIVERED + stat.byStatus.READ} delivered,{" "}
              {stat.byStatus.READ} read, {stat.byStatus.FAILED} didn&apos;t go
              out.
              {stat.topFailures.length > 0
                ? ` Most common problem: ${stat.topFailures[0]!.reason}.`
                : ""}
            </p>
            <WhatsAppTemplateForm
              info={info}
              initial={template}
              canManage={canManage}
            />
          </AdminCard>
        );
      })}
    </main>
  );
}
