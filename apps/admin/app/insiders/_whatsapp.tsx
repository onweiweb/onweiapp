import {
  CAMPAIGN_FILL_LABELS,
  getCampaign,
  getInsiderWhatsAppStats,
  listCampaigns,
  listWhatsAppMessages,
  WHATSAPP_PURPOSES,
  type CampaignCounts,
  type InsiderWhatsAppStats,
  type WhatsAppLogRow,
} from "@onwei/core";
import type { WhatsAppStatus } from "@onwei/database";
import { after, MESSAGE_WHEN } from "../_lib/messageTiming";
import { PAGE_SIZE } from "../_lib/pagination";
import {
  AdminBadge,
  AdminCard,
  AdminPager,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  type StatusTone,
} from "../_components/ui";
import { WhatsAppSender } from "./_whatsappSend";
import { FailedBadge, WhatsAppFailure } from "../_components/WhatsAppFailure";

/**
 * Insiders > WhatsApp: send any approved template to a group of Insiders,
 * see each send and how far every message got, and the automatic Insider
 * messages (welcome, code with the email).
 */

export const WHATSAPP_RANGES = ["7d", "30d", "all"] as const;
export type WhatsAppRange = (typeof WHATSAPP_RANGES)[number];

const RANGE_LABELS: Record<WhatsAppRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

const RANGE_DAYS: Record<WhatsAppRange, number | null> = {
  "7d": 7,
  "30d": 30,
  all: null,
};

export const WHATSAPP_VIEWS = ["send", "log", "auto"] as const;
export type WhatsAppView = (typeof WHATSAPP_VIEWS)[number];

const VIEW_LABELS: Record<WhatsAppView, string> = {
  send: "New message",
  log: "Sent messages",
  auto: "Automatic messages",
};

const STATUS_INFO: Record<WhatsAppStatus, { label: string; tone: StatusTone }> =
  {
    SENDING: { label: "Sending", tone: "pending" },
    SENT: { label: "Sent", tone: "active" },
    DELIVERED: { label: "Delivered", tone: "success" },
    READ: { label: "Read", tone: "success" },
    FAILED: { label: "Failed", tone: "problem" },
  };

const STATUSES = Object.keys(STATUS_INFO) as WhatsAppStatus[];

function ViewLinks({ active }: { active: WhatsAppView }) {
  return (
    <div className="flex flex-wrap gap-2">
      {WHATSAPP_VIEWS.map((view) => (
        <a
          key={view}
          href={`/insiders?tab=whatsapp&view=${view}`}
          className={`rounded-full px-4 py-2 text-sm ${
            view === active
              ? "bg-onwei-blue text-onwei-beige"
              : "border border-onwei-blue/30 text-onwei-blue hover:border-onwei-blue"
          }`}
        >
          {VIEW_LABELS[view]}
        </a>
      ))}
    </div>
  );
}

/** Delivered includes read: a read message was delivered first. */
function DeliveryBar({ counts }: { counts: CampaignCounts }) {
  const total = Math.max(counts.total, 1);
  const parts = [
    { key: "READ", n: counts.READ, className: "bg-onwei-blue" },
    { key: "DELIVERED", n: counts.DELIVERED, className: "bg-onwei-purple" },
    {
      key: "SENT",
      n: counts.SENT + counts.SENDING,
      className: "bg-onwei-blue/25",
    },
    { key: "FAILED", n: counts.FAILED, className: "bg-onwei-black" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-onwei-beige">
        {parts.map((p) =>
          p.n > 0 ? (
            <div
              key={p.key}
              className={p.className}
              style={{ width: `${(p.n / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <Stat label="Sent" value={counts.total} />
        <Stat
          label="Delivered"
          value={counts.DELIVERED + counts.READ}
          dot="bg-onwei-purple"
        />
        <Stat label="Read" value={counts.READ} dot="bg-onwei-blue" />
        <Stat label="Failed" value={counts.FAILED} dot="bg-onwei-black" />
        {counts.held > 0 ? (
          <Stat label="Held by Meta" value={counts.held} />
        ) : null}
      </dl>
    </div>
  );
}

function Stat({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {dot ? <span className={`h-2 w-2 rounded-full ${dot}`} /> : null}
      <dt className="text-onwei-blue/70">{label}</dt>
      <dd className="font-semibold text-onwei-blue">
        {value.toLocaleString("en-IN")}
      </dd>
    </div>
  );
}

function MessageTable({
  rows,
  showKind,
}: {
  rows: WhatsAppLogRow[];
  showKind: boolean;
}) {
  return (
    <AdminTable>
      <AdminTableHead>
        <AdminTableHeaderCell>When</AdminTableHeaderCell>
        {showKind ? <AdminTableHeaderCell>Message</AdminTableHeaderCell> : null}
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
                {MESSAGE_WHEN.format(row.createdAt)}
              </AdminTableCell>
              {showKind ? (
                <AdminTableCell>
                  {row.purpose === "CAMPAIGN"
                    ? (row.templateName ?? "Insiders send")
                    : WHATSAPP_PURPOSES[row.purpose].title}
                </AdminTableCell>
              ) : null}
              <AdminTableCell>
                <p>{row.name ?? "Test send"}</p>
                <p className="text-xs text-onwei-blue/60">{row.phone}</p>
              </AdminTableCell>
              <AdminTableCell className="max-w-sm">
                {row.status === "FAILED" ? (
                  <FailedBadge code={row.failureCode} />
                ) : (
                  <AdminBadge tone={info.tone}>{info.label}</AdminBadge>
                )}
                {timing ? (
                  <span className="ml-2 text-xs text-onwei-blue/60">
                    {timing}
                  </span>
                ) : null}
                {row.status === "FAILED" ? (
                  <WhatsAppFailure
                    code={row.failureCode}
                    reason={row.failureReason}
                  />
                ) : null}
              </AdminTableCell>
            </AdminTableRow>
          );
        })}
      </tbody>
    </AdminTable>
  );
}

function StatusFilter({
  base,
  status,
}: {
  base: string;
  status: WhatsAppStatus | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[undefined, ...STATUSES].map((s) => (
        <a
          key={s ?? "all"}
          href={s ? `${base}&status=${s}` : base}
          className={`rounded-full px-3 py-1 text-sm ${
            s === status
              ? "bg-onwei-blue text-onwei-beige"
              : "border border-onwei-blue/30 text-onwei-blue"
          }`}
        >
          {s ? STATUS_INFO[s].label : "All"}
        </a>
      ))}
    </div>
  );
}

function percent(n: number, of: number): string {
  if (of === 0) return "";
  return `${Math.round((n / of) * 100)}%`;
}

function NumberTile({
  label,
  value,
  of,
  hint,
}: {
  label: string;
  value: number;
  of?: number;
  hint: string;
}) {
  return (
    <div className="rounded-[20px] bg-onwei-beige/60 p-4">
      <p className="text-sm text-onwei-blue/70">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-onwei-blue">
          {value.toLocaleString("en-IN")}
        </span>
        {of !== undefined && of > 0 ? (
          <span className="text-sm text-onwei-blue/70">
            {percent(value, of)}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-onwei-blue/60">{hint}</p>
    </div>
  );
}

const PURPOSE_ROWS: {
  key: keyof InsiderWhatsAppStats["byPurpose"];
  label: string;
}[] = [
  { key: "CAMPAIGN", label: "Sent from New message" },
  { key: "WAITLIST_JOINED", label: "Welcome message (automatic)" },
  { key: "INSIDER_CODE", label: "Insider code message (automatic)" },
];

async function WhatsAppNumbers({
  range,
  view,
}: {
  range: WhatsAppRange;
  view: WhatsAppView;
}) {
  const days = RANGE_DAYS[range];
  const stats = await getInsiderWhatsAppStats({
    days: days ?? undefined,
  });
  const { all } = stats;
  const delivered = all.DELIVERED + all.READ;
  const waiting = all.SENT + all.SENDING;
  return (
    <AdminCard>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-onwei-blue">
            How Insider WhatsApps are doing
          </h2>
          <div className="flex flex-wrap gap-2">
            {WHATSAPP_RANGES.map((r) => (
              <a
                key={r}
                href={`/insiders?tab=whatsapp&view=${view}&range=${r}`}
                className={`rounded-full px-3 py-1 text-sm ${
                  r === range
                    ? "bg-onwei-blue text-onwei-beige"
                    : "border border-onwei-blue/30 text-onwei-blue"
                }`}
              >
                {RANGE_LABELS[r]}
              </a>
            ))}
          </div>
        </div>
        {all.total === 0 ? (
          <p className="text-sm text-onwei-blue/70">
            No Insider WhatsApps in this period yet.
          </p>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-3 ${all.held > 0 ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}
            >
              <NumberTile
                label="Sent"
                value={all.total}
                hint="Every message we tried to send"
              />
              <NumberTile
                label="Delivered"
                value={delivered}
                of={all.total}
                hint="Reached the phone (includes read)"
              />
              <NumberTile
                label="Read"
                value={all.READ}
                of={all.total}
                hint="Opened, if the person has read receipts on"
              />
              <NumberTile
                label="Not delivered yet"
                value={waiting}
                of={all.total}
                hint="Phone off or no update from WhatsApp yet"
              />
              <NumberTile
                label="Failed"
                value={all.FAILED}
                of={all.total}
                hint="WhatsApp could not deliver it"
              />
              {all.held > 0 ? (
                <NumberTile
                  label="Held by Meta"
                  value={all.held}
                  of={all.total}
                  hint="Marketing limits or Meta's tests. Not counted as failed; they can be sent again later"
                />
              ) : null}
            </div>
            <AdminTable>
              <AdminTableHead>
                <AdminTableHeaderCell>Message</AdminTableHeaderCell>
                <AdminTableHeaderCell>Sent</AdminTableHeaderCell>
                <AdminTableHeaderCell>Delivered</AdminTableHeaderCell>
                <AdminTableHeaderCell>Read</AdminTableHeaderCell>
                <AdminTableHeaderCell>Failed</AdminTableHeaderCell>
              </AdminTableHead>
              <tbody>
                {PURPOSE_ROWS.map(({ key, label }) => {
                  const c = stats.byPurpose[key];
                  const d = c.DELIVERED + c.READ;
                  return (
                    <AdminTableRow key={key}>
                      <AdminTableCell>{label}</AdminTableCell>
                      <AdminTableCell>
                        {c.total.toLocaleString("en-IN")}
                      </AdminTableCell>
                      <AdminTableCell>
                        {d.toLocaleString("en-IN")}{" "}
                        <span className="text-onwei-blue/60">
                          {percent(d, c.total)}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        {c.READ.toLocaleString("en-IN")}{" "}
                        <span className="text-onwei-blue/60">
                          {percent(c.READ, c.total)}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        {c.FAILED.toLocaleString("en-IN")}{" "}
                        <span className="text-onwei-blue/60">
                          {percent(c.FAILED, c.total)}
                        </span>
                        {c.held > 0 ? (
                          <span className="block text-xs text-onwei-blue/60">
                            + {c.held.toLocaleString("en-IN")} held by Meta
                          </span>
                        ) : null}
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </AdminTable>
            {stats.topFailures.length > 0 ? (
              <div>
                <p className="mb-1 text-sm font-semibold text-onwei-blue">
                  Most common reasons for failing
                </p>
                <ul className="flex flex-col gap-1 text-sm text-onwei-blue">
                  {stats.topFailures.map((f) => (
                    <li key={f.code ?? f.message} className="flex gap-2">
                      <span className="shrink-0 font-semibold">
                        {f.count.toLocaleString("en-IN")}
                      </span>
                      <span className="min-w-0 break-words text-onwei-blue/80">
                        {f.message}
                        {f.raw && f.raw !== f.message ? (
                          <span className="block text-xs text-onwei-blue/50">
                            {f.raw.replace(/^null,\s*/i, "")}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AdminCard>
  );
}

async function CampaignList({ page }: { page: number }) {
  const { rows, hasNext } = await listCampaigns({ page, pageSize: PAGE_SIZE });
  if (rows.length === 0 && page === 1) {
    return (
      <EmptyState
        title="Nothing sent yet"
        description="Sends from “New message” show up here with how many were delivered and read."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <a
          key={row.id}
          href={`/insiders?tab=whatsapp&view=log&campaign=${row.id}`}
          className="block rounded-[30px] border border-onwei-beige bg-onwei-white p-5 transition hover:border-onwei-blue/40"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="break-all font-semibold text-onwei-blue">
                  {row.templateName}
                </span>
                <AdminBadge
                  tone={row.category === "UTILITY" ? "success" : "active"}
                >
                  {row.category.toLowerCase()}
                </AdminBadge>
              </p>
              <p className="text-sm text-onwei-blue/70">
                {row.audienceLabel} · {row.plannedCount.toLocaleString("en-IN")}{" "}
                planned
              </p>
            </div>
            <p className="text-right text-xs text-onwei-blue/60">
              {MESSAGE_WHEN.format(row.createdAt)}
              {row.sentBy ? (
                <>
                  <br />
                  by {row.sentBy}
                </>
              ) : null}
            </p>
          </div>
          <DeliveryBar counts={row.counts} />
        </a>
      ))}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{ tab: "whatsapp", view: "log" }}
      />
    </div>
  );
}

function describeBody(text: string, labels: string[]): string {
  return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, n: string) => {
    const label = labels[Number(n) - 1];
    return label ? `[${label}]` : match;
  });
}

async function CampaignDetail({
  id,
  page,
  status,
}: {
  id: string;
  page: number;
  status: WhatsAppStatus | undefined;
}) {
  const campaign = await getCampaign(id);
  if (!campaign) {
    return (
      <EmptyState
        title="That send isn't there"
        description="It may have been opened from an old link."
      />
    );
  }
  const { rows, hasNext } = await listWhatsAppMessages({
    page,
    pageSize: PAGE_SIZE,
    campaignId: id,
    status,
  });
  const labels = campaign.fill.map((slot) =>
    slot.kind === "text"
      ? `“${slot.text ?? ""}”`
      : CAMPAIGN_FILL_LABELS[slot.kind],
  );
  const base = `/insiders?tab=whatsapp&view=log&campaign=${id}`;

  return (
    <div className="flex flex-col gap-4">
      <a
        href="/insiders?tab=whatsapp&view=log"
        className="text-sm text-onwei-blue underline"
      >
        Back to sent messages
      </a>
      <AdminCard className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-onwei-blue">
              <span className="break-all">{campaign.templateName}</span>
              <AdminBadge
                tone={campaign.category === "UTILITY" ? "success" : "active"}
              >
                {campaign.category.toLowerCase()}
              </AdminBadge>
            </h3>
            <p className="text-sm text-onwei-blue/70">
              {campaign.audienceLabel} · sent{" "}
              {MESSAGE_WHEN.format(campaign.createdAt)}
              {campaign.sentBy ? ` by ${campaign.sentBy}` : ""}
            </p>
          </div>
          {campaign.counts.total < campaign.plannedCount ? (
            <p className="max-w-xs text-right text-xs text-onwei-blue/70">
              {campaign.plannedCount - campaign.counts.total} of{" "}
              {campaign.plannedCount} planned were not sent (stopped, or left
              out at send time).
            </p>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap rounded-2xl bg-onwei-beige/60 p-4 text-sm text-onwei-blue">
          {describeBody(campaign.bodyText, labels)}
        </p>
        <DeliveryBar counts={campaign.counts} />
      </AdminCard>
      <StatusFilter base={base} status={status} />
      {rows.length === 0 ? (
        <EmptyState
          title="No messages here"
          description="Try another status above."
        />
      ) : (
        <MessageTable rows={rows} showKind={false} />
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{ tab: "whatsapp", view: "log", campaign: id, status }}
      />
    </div>
  );
}

async function AutomaticLog({
  page,
  status,
}: {
  page: number;
  status: WhatsAppStatus | undefined;
}) {
  const { rows, hasNext } = await listWhatsAppMessages({
    page,
    pageSize: PAGE_SIZE,
    purposes: ["WAITLIST_JOINED", "INSIDER_CODE"],
    status,
  });
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-onwei-blue/80">
        Messages Onwei sends on its own: the welcome right after someone joins,
        and the Insider code sent with the Insider email. Their templates are
        set up on the WhatsApp page.
      </p>
      <StatusFilter base="/insiders?tab=whatsapp&view=auto" status={status} />
      {rows.length === 0 ? (
        <EmptyState
          title="No automatic messages yet"
          description="They show up here once the welcome or Insider code message is switched on."
        />
      ) : (
        <MessageTable rows={rows} showKind />
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{ tab: "whatsapp", view: "auto", status }}
      />
    </div>
  );
}

export function WhatsAppTab({
  canManage,
  view,
  page,
  campaign,
  status,
  range = "30d",
}: {
  canManage: boolean;
  range?: WhatsAppRange;
  view: WhatsAppView;
  page: number;
  campaign?: string;
  status?: string;
}) {
  const statusFilter =
    status && status in STATUS_INFO ? (status as WhatsAppStatus) : undefined;
  return (
    <div className="flex flex-col gap-5">
      <ViewLinks active={view} />
      {view !== "send" && !campaign ? (
        <WhatsAppNumbers range={range} view={view} />
      ) : null}
      {view === "send" ? (
        canManage ? (
          <WhatsAppSender canManage={canManage} />
        ) : (
          <AdminCard>
            <p className="text-sm text-onwei-blue">
              Ask someone who can manage Insiders to send WhatsApp messages. You
              can still see what was sent under &ldquo;Sent messages&rdquo;.
            </p>
          </AdminCard>
        )
      ) : null}
      {view === "log" ? (
        campaign ? (
          <CampaignDetail id={campaign} page={page} status={statusFilter} />
        ) : (
          <CampaignList page={page} />
        )
      ) : null}
      {view === "auto" ? (
        <AutomaticLog page={page} status={statusFilter} />
      ) : null}
    </div>
  );
}
