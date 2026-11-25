import {
  getInsiderOverview,
  istDateOf,
  getPrintedCardOverview,
  LOW_FREE_CARDS,
  PRINT_RUN_SIZE,
  listInsiderEmailStatus,
  type InsiderEmailStatus,
  listInsiderUpdates,
} from "@onwei/core";
import { hasPermission } from "@onwei/auth";
import { redirect } from "next/navigation";
import { requirePageSession } from "../_lib/requirePageSession";
import { parsePage, PAGE_SIZE } from "../_lib/pagination";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminPager,
  AdminTabLinks,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  PageHeader,
} from "../_components/ui";
import { CreateCodesButton, EmailSender, FillCardsButton } from "./_components";
import { CARD_SHIP_VIEWS, ShipCardsTab, type CardShipView } from "./_shipCards";
import { MembersTab } from "./_members";
import { ApplicationsTab } from "./_applications";
import { RewardsTab } from "./_rewards";
import {
  WHATSAPP_RANGES,
  WHATSAPP_VIEWS,
  WhatsAppTab,
  type WhatsAppRange,
  type WhatsAppView,
} from "./_whatsapp";
import { toUpdateRow } from "./_updateRow";
import { AddUpdateButton, UpdateActions } from "./_updates";

const TABS = [
  { id: "members", label: "Members" },
  { id: "applications", label: "Applications" },
  { id: "rewards", label: "Invite rewards" },
  { id: "overview", label: "Overview" },
  { id: "ship", label: "Ship cards" },
  { id: "cards", label: "Printed cards" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "updates", label: "Page updates" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <AdminCard>
      <p className="text-sm text-onwei-blue/70">{label}</p>
      <p className="text-3xl font-bold text-onwei-blue">{value}</p>
      {hint ? <p className="mt-1 text-xs text-onwei-blue/60">{hint}</p> : null}
    </AdminCard>
  );
}

export default async function InsidersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    show?: string;
    q?: string;
    view?: string;
    campaign?: string;
    status?: string;
    range?: string;
    activity?: string;
    reason?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const staff = await requirePageSession("waitlist:view");
  const canManage = hasPermission(staff.permissions, "waitlist:manage");
  const params = await searchParams;
  // The Insider discount moved to Coupons and discounts.
  if (params.tab === "discount") redirect("/coupons?tab=insider");
  // Card addresses became Ship cards.
  if (params.tab === "addresses") redirect("/insiders?tab=ship");
  const tab: TabId = TABS.some((t) => t.id === params.tab)
    ? (params.tab as TabId)
    : "members";

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Insiders"
        description="Onwei Insiders get a personal, lifetime discount code. See who joined, review applications, set invite rewards, email the codes, and post the Insider cards."
      />
      <AdminTabLinks basePath="/insiders" tabs={TABS} active={tab} />
      {tab === "members" ? (
        <MembersTab page={parsePage(params.page)} q={params.q} />
      ) : null}
      {tab === "applications" ? (
        <ApplicationsTab
          canManage={canManage}
          page={parsePage(params.page)}
          params={params}
        />
      ) : null}
      {tab === "rewards" ? <RewardsTab canManage={canManage} /> : null}
      {tab === "overview" ? <OverviewTab canManage={canManage} /> : null}
      {tab === "ship" ? (
        <ShipCardsTab
          canManage={canManage}
          page={parsePage(params.page)}
          view={
            CARD_SHIP_VIEWS.includes(params.view as CardShipView)
              ? (params.view as CardShipView)
              : "ready"
          }
        />
      ) : null}
      {tab === "email" ? (
        <EmailTab
          canManage={canManage}
          page={parsePage(params.page)}
          show={
            params.show === "sent" || params.show === "all"
              ? params.show
              : "notSent"
          }
        />
      ) : null}
      {tab === "whatsapp" ? (
        <WhatsAppTab
          canManage={canManage}
          view={
            WHATSAPP_VIEWS.includes(params.view as WhatsAppView)
              ? (params.view as WhatsAppView)
              : "send"
          }
          page={parsePage(params.page)}
          campaign={params.campaign?.slice(0, 64)}
          status={params.status}
          range={
            WHATSAPP_RANGES.includes(params.range as WhatsAppRange)
              ? (params.range as WhatsAppRange)
              : "30d"
          }
        />
      ) : null}
      {tab === "cards" ? <PrintedCardsTab canManage={canManage} /> : null}
      {tab === "updates" ? <UpdatesTab canManage={canManage} /> : null}
    </main>
  );
}

async function OverviewTab({ canManage }: { canManage: boolean }) {
  const overview = await getInsiderOverview();
  const missing = overview.members - overview.withCode;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Insiders" value={overview.members} />
        <Stat label="Have a code" value={overview.withCode} />
        <Stat
          label="Code email sent"
          value={overview.emailed}
          hint={`${overview.toEmail} still to send`}
        />
        <Stat
          label="Addresses shared"
          value={overview.addresses}
          hint={`${overview.cardsPosted} cards posted`}
        />
      </div>
      {missing > 0 ? (
        <AdminCard className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-onwei-blue">
            {missing} {missing === 1 ? "person joined" : "people joined"} before
            codes existed and {missing === 1 ? "has" : "have"} no code yet.
            {canManage
              ? ""
              : " Ask someone who can manage Insiders to create them."}
          </p>
          {canManage ? <CreateCodesButton missing={missing} /> : null}
        </AdminCard>
      ) : null}
      {overview.unsubscribed > 0 ? (
        <p className="text-sm text-onwei-blue/70">
          {overview.unsubscribed} unsubscribed from Insider emails. They keep
          their code but won&apos;t get emails.
        </p>
      ) : null}
    </div>
  );
}

const EMAIL_SHOW_OPTIONS = [
  { id: "notSent", label: "Not sent yet" },
  { id: "sent", label: "Sent" },
  { id: "all", label: "Everyone" },
] as const;

const EMAIL_STATUS: Record<
  InsiderEmailStatus,
  { label: string; tone: "pending" | "active" | "success" | "problem" }
> = {
  SENT: { label: "Sent", tone: "success" },
  SENDING: { label: "Sending now", tone: "active" },
  WAITING: { label: "Waiting", tone: "pending" },
  UNSUBSCRIBED: { label: "Unsubscribed", tone: "problem" },
  NO_CODE: { label: "No code yet", tone: "problem" },
};

async function EmailTab({
  canManage,
  page,
  show,
}: {
  canManage: boolean;
  page: number;
  show: "notSent" | "sent" | "all";
}) {
  const [overview, list] = await Promise.all([
    getInsiderOverview(),
    listInsiderEmailStatus({ page, pageSize: PAGE_SIZE, show }),
  ]);
  const missing = overview.members - overview.withCode;
  const fromSakshi = Boolean(process.env.INSIDER_EMAIL_FROM);
  const live = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="flex flex-col gap-4">
      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">
          “A little thank you from us”
        </h2>
        <p className="text-sm text-onwei-blue/80">
          Each Insider gets their own code and a private link to share their
          address for the Insider card. Nobody gets it twice, and people who
          unsubscribed are skipped. New signups are not emailed on their own:
          they wait in the &ldquo;Not sent yet&rdquo; list below until someone
          presses this button. When the Insider WhatsApp is switched on (see the
          WhatsApp page), everyone emailed also gets it on WhatsApp.
        </p>
        <ul className="list-inside list-disc text-sm text-onwei-blue/80">
          <li>{overview.toEmail} waiting for the email</li>
          <li>{overview.emailed} already sent</li>
          {overview.unsubscribed > 0 ? (
            <li>{overview.unsubscribed} unsubscribed, skipped</li>
          ) : null}
          {missing > 0 ? (
            <li>
              {missing} without a code yet, create codes on the Overview tab
              first
            </li>
          ) : null}
        </ul>
        {!live ? (
          <p className="rounded-lg bg-onwei-beige px-3 py-2 text-sm text-onwei-blue">
            Email sending isn&apos;t switched on here, so emails are only
            written to the server log. Nothing reaches anyone&apos;s inbox.
          </p>
        ) : !fromSakshi ? (
          <p className="rounded-lg bg-onwei-beige px-3 py-2 text-sm text-onwei-blue">
            These go out from the general Onwei address. To send them from
            Sakshi, the Insider sender address has to be set up first.
          </p>
        ) : null}
        {canManage ? (
          <EmailSender toEmail={overview.toEmail} />
        ) : (
          <p className="text-sm">
            Ask someone who can manage Insiders to send these.
          </p>
        )}
      </AdminCard>

      <div className="flex flex-wrap gap-2">
        {EMAIL_SHOW_OPTIONS.map((option) => (
          <a
            key={option.id}
            href={`/insiders?tab=email&show=${option.id}`}
            className={`rounded-full px-3 py-1 text-sm ${
              option.id === show
                ? "bg-onwei-blue text-onwei-beige"
                : "border border-onwei-blue/30 text-onwei-blue"
            }`}
          >
            {option.label}
          </a>
        ))}
      </div>
      {list.rows.length === 0 ? (
        <EmptyState
          title={
            show === "sent"
              ? "No emails sent yet"
              : show === "notSent"
                ? "Everyone has had the email"
                : "No Insiders yet"
          }
          description={
            show === "notSent"
              ? "New Insiders show up here until someone sends the email."
              : "People show up here once they sign up."
          }
        />
      ) : (
        <>
          <p className="text-sm text-onwei-blue/70">
            {list.total} in this list
          </p>
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email</AdminTableHeaderCell>
              <AdminTableHeaderCell>Code</AdminTableHeaderCell>
              <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
              <AdminTableHeaderCell>Insider email</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {list.rows.map((row) => (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>{row.fullName}</AdminTableCell>
                  <AdminTableCell>{row.email}</AdminTableCell>
                  <AdminTableCell>{row.insiderCode ?? "-"}</AdminTableCell>
                  <AdminTableCell>{istDateOf(row.joinedAt)}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone={EMAIL_STATUS[row.status].tone}>
                      {row.status === "SENT" && row.emailedAt
                        ? `Sent ${istDateOf(row.emailedAt)}`
                        : EMAIL_STATUS[row.status].label}
                    </AdminBadge>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        </>
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={list.hasNext}
        params={{ tab: "email", show }}
      />
    </div>
  );
}

async function PrintedCardsTab({ canManage }: { canManage: boolean }) {
  const cards = await getPrintedCardOverview();
  const notSetUp = cards.printed === 0;
  const toAdd = Math.max(
    PRINT_RUN_SIZE - cards.printed,
    cards.membersWithoutCard,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Cards made"
          value={cards.printed}
          hint="One code per printed card"
        />
        <Stat label="Given to an Insider" value={cards.given} />
        <Stat
          label="Free"
          value={cards.free}
          hint="The next people to join get these, lowest number first"
        />
        <Stat
          label="Insiders with no printed card"
          value={cards.membersWithoutCard}
          hint="Their code isn't on a card yet"
        />
      </div>

      {!notSetUp && cards.free < LOW_FREE_CARDS ? (
        <AdminCard>
          <p className="text-sm text-onwei-blue">
            {cards.free === 0
              ? "Every printed card has been given out. "
              : `Only ${cards.free} free ${cards.free === 1 ? "card is" : "cards are"} left. `}
            New Insiders after that still get a code, but it won&apos;t be on a
            printed card until you top up and print more.
          </p>
        </AdminCard>
      ) : null}

      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">
          {notSetUp ? "Set up the cards" : "Top up"}
        </h2>
        <p className="text-sm text-onwei-blue/70">
          {notSetUp
            ? `Makes ${PRINT_RUN_SIZE} card codes in all. Everyone who already has a code gets a card number first (earliest signups first), the rest are free codes for people who join later. Existing codes don't change.`
            : `Brings the total back up to ${PRINT_RUN_SIZE} and gives a card number to any Insider whose code isn't on a card yet. Cards already made never change.`}
        </p>
        {cards.retired > 0 ? (
          <p className="text-xs text-onwei-blue/60">
            {cards.retired}{" "}
            {cards.retired === 1 ? "card belongs" : "cards belong"} to people
            who were removed from Insiders. Those cards are never given to
            anyone else.
          </p>
        ) : null}
        {canManage ? (
          <FillCardsButton toAdd={toAdd} firstTime={notSetUp} />
        ) : (
          <p className="text-sm text-onwei-blue/70">
            Ask someone who can manage Insiders to set up the cards.
          </p>
        )}
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">
          List for the printer
        </h2>
        <p className="text-sm text-onwei-blue/70">
          A spreadsheet with each card&apos;s number, its code and the link the
          QR code opens (the Onwei website, tagged so scans show up under
          Visitors). No names or addresses are in it. Ask the printer for a
          proof of a few cards first and check the codes against the list.
        </p>
        {notSetUp ? (
          <p className="text-sm text-onwei-blue/70">Set up the cards first.</p>
        ) : (
          <a href="/api/insiders/printed-cards/export" className="self-start">
            <AdminButton type="button" variant="secondary">
              Download list for the printer (CSV)
            </AdminButton>
          </a>
        )}
      </AdminCard>
    </div>
  );
}

const UPDATE_DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** Events and offers shown on the storefront /insiders page. */
async function UpdatesTab({ canManage }: { canManage: boolean }) {
  const updates = await listInsiderUpdates();
  return (
    <AdminCard className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Events and Insider offers
          </h2>
          <p className="text-sm text-onwei-blue/70">
            Shown on onwei.in/insiders under the signup form, in the order
            below. Switched-off updates stay here but don&apos;t show.
          </p>
        </div>
        {canManage ? <AddUpdateButton /> : null}
      </div>
      {updates.length === 0 ? (
        <EmptyState
          title="No updates yet"
          description="Add an event or an offer and it shows on the Insiders page. With none, that section is hidden."
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Update</AdminTableHeaderCell>
            <AdminTableHeaderCell>Date</AdminTableHeaderCell>
            <AdminTableHeaderCell>Showing</AdminTableHeaderCell>
            <AdminTableHeaderCell>Order</AdminTableHeaderCell>
            {canManage ? <AdminTableHeaderCell> </AdminTableHeaderCell> : null}
          </AdminTableHead>
          <tbody>
            {updates.map((update) => (
              <AdminTableRow key={update.id}>
                <AdminTableCell>
                  <p className="font-medium">{update.title}</p>
                  <p className="line-clamp-1 text-xs text-onwei-blue/60">
                    {update.body}
                  </p>
                </AdminTableCell>
                <AdminTableCell>
                  {update.eventDate
                    ? UPDATE_DATE.format(update.eventDate)
                    : "-"}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={update.isActive ? "success" : "pending"}>
                    {update.isActive ? "On" : "Off"}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>{update.sortOrder}</AdminTableCell>
                {canManage ? (
                  <AdminTableCell>
                    <UpdateActions update={toUpdateRow(update)} />
                  </AdminTableCell>
                ) : null}
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminCard>
  );
}
