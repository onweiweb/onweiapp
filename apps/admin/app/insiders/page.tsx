import {
  getInsiderDefaultPercent,
  getInsiderOverview,
  istDateOf,
  istLastDayOf,
  listCardAddresses,
  listInsiderTiers,
} from "@onwei/core";
import { hasPermission } from "@onwei/auth";
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
import {
  CreateCodesButton,
  DefaultPercentForm,
  EmailSender,
  PostedToggle,
  TierActions,
  TierForm,
} from "./_components";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "discount", label: "Discount" },
  { id: "addresses", label: "Card addresses" },
  { id: "email", label: "Email" },
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
  searchParams: Promise<{ tab?: string; page?: string; show?: string }>;
}) {
  const staff = await requirePageSession("waitlist:view");
  const canManage = hasPermission(staff.permissions, "waitlist:manage");
  const params = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === params.tab)
    ? (params.tab as TabId)
    : "overview";

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Insiders"
        description="Everyone on the waitlist is an Onwei Insider with a personal, lifetime discount code. Set the discount, email the codes, and post the Insider cards."
      />
      <AdminTabLinks basePath="/insiders" tabs={TABS} active={tab} />
      {tab === "overview" ? <OverviewTab canManage={canManage} /> : null}
      {tab === "discount" ? <DiscountTab canManage={canManage} /> : null}
      {tab === "addresses" ? (
        <AddressesTab
          canManage={canManage}
          page={parsePage(params.page)}
          show={
            params.show === "all" || params.show === "posted"
              ? params.show
              : "toPost"
          }
        />
      ) : null}
      {tab === "email" ? <EmailTab canManage={canManage} /> : null}
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
              : " Ask someone who can manage the waitlist to create them."}
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

async function DiscountTab({ canManage }: { canManage: boolean }) {
  const [defaultPercent, tiers] = await Promise.all([
    getInsiderDefaultPercent(),
    listInsiderTiers(),
  ]);
  const rows = tiers.map((tier) => ({
    id: tier.id,
    label: tier.label,
    startDate: istDateOf(tier.startsAt),
    endDate: istLastDayOf(tier.endsAt),
    percent: tier.percent,
  }));

  return (
    <div className="flex flex-col gap-6">
      <AdminCard className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-onwei-blue">
          Insider discount
        </h2>
        {canManage ? (
          <DefaultPercentForm initial={defaultPercent} />
        ) : (
          <p className="text-sm">Every Insider gets {defaultPercent}% off.</p>
        )}
        <p className="text-xs text-onwei-blue/60">
          Changes apply to the next order an Insider places. Orders already
          placed keep the discount they got. Each coupon decides whether it can
          be used together with the Insider discount.
        </p>
      </AdminCard>

      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Tiers by signup date
          </h2>
          <p className="text-sm text-onwei-blue/70">
            Optional. Give people who signed up between two dates a different
            discount, for example more for the earliest Insiders. Dates are in
            India time. Anyone outside every tier gets the discount above.
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="No tiers yet"
            description={`Every Insider gets ${defaultPercent}% off.`}
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Signed up</AdminTableHeaderCell>
              <AdminTableHeaderCell>Discount</AdminTableHeaderCell>
              {canManage ? (
                <AdminTableHeaderCell>{""}</AdminTableHeaderCell>
              ) : null}
            </AdminTableHead>
            <tbody>
              {rows.map((row) => (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>{row.label}</AdminTableCell>
                  <AdminTableCell>
                    {row.startDate} to {row.endDate}
                  </AdminTableCell>
                  <AdminTableCell>{row.percent}%</AdminTableCell>
                  {canManage ? (
                    <AdminTableCell>
                      <TierActions tier={row} />
                    </AdminTableCell>
                  ) : null}
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
        {canManage ? (
          <div className="border-t border-onwei-blue/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-onwei-blue">
              Add a tier
            </h3>
            <TierForm />
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}

const SHOW_OPTIONS = [
  { id: "toPost", label: "To post" },
  { id: "posted", label: "Posted" },
  { id: "all", label: "All" },
] as const;

async function AddressesTab({
  canManage,
  page,
  show,
}: {
  canManage: boolean;
  page: number;
  show: "all" | "toPost" | "posted";
}) {
  const { rows, hasNext, total } = await listCardAddresses({
    page,
    pageSize: PAGE_SIZE,
    show,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {SHOW_OPTIONS.map((option) => (
            <a
              key={option.id}
              href={`/insiders?tab=addresses&show=${option.id}`}
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
        <a
          href={`/api/insiders/addresses/export${show === "toPost" ? "" : "?all=1"}`}
        >
          <AdminButton type="button" variant="secondary">
            {show === "toPost"
              ? "Download addresses to post (CSV)"
              : "Download all (CSV)"}
          </AdminButton>
        </a>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={
            show === "toPost" ? "Nothing to post right now" : "No addresses yet"
          }
          description="Addresses show up here when Insiders use the “Share your address” link in their email."
        />
      ) : (
        <>
          <p className="text-sm text-onwei-blue/70">{total} in this list</p>
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Address</AdminTableHeaderCell>
              <AdminTableHeaderCell>Phone</AdminTableHeaderCell>
              <AdminTableHeaderCell>Code</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              {canManage ? (
                <AdminTableHeaderCell>{""}</AdminTableHeaderCell>
              ) : null}
            </AdminTableHead>
            <tbody>
              {rows.map((row) => (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>{row.fullName}</AdminTableCell>
                  <AdminTableCell>
                    {row.line1}
                    {row.line2 ? `, ${row.line2}` : ""}, {row.city}, {row.state}{" "}
                    {row.postalCode}
                  </AdminTableCell>
                  <AdminTableCell>{row.phone}</AdminTableCell>
                  <AdminTableCell>{row.insiderCode ?? "-"}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone={row.postedAt ? "success" : "pending"}>
                      {row.postedAt
                        ? `Posted ${istDateOf(row.postedAt)}`
                        : "To post"}
                    </AdminBadge>
                  </AdminTableCell>
                  {canManage ? (
                    <AdminTableCell>
                      <PostedToggle
                        id={row.id}
                        posted={Boolean(row.postedAt)}
                      />
                    </AdminTableCell>
                  ) : null}
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        </>
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{ tab: "addresses", show }}
      />
    </div>
  );
}

async function EmailTab({ canManage }: { canManage: boolean }) {
  const overview = await getInsiderOverview();
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
          unsubscribed are skipped. New signups are added to the count below, so
          press send again later to reach them.
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
            Ask someone who can manage the waitlist to send these.
          </p>
        )}
      </AdminCard>
    </div>
  );
}
