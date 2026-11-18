import Link from "next/link";
import {
  formatCurrency,
  listCouponsForAdmin,
  listGiftableItems,
  type CouponGroup,
  type CouponState,
} from "@onwei/core";
import { hasPermission } from "@onwei/auth";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminBadge,
  AdminTabLinks,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  LinkButton,
  PageHeader,
  type StatusTone,
} from "../_components/ui";
import { CouponRowActions } from "./_components/CouponActions";
import { PriceChecker } from "./_components/PriceChecker";
import { InsiderDiscountTab } from "./_insider";
import { PreorderTab } from "./_preorder";

const TABS = [
  { id: "coupons", label: "Coupons" },
  { id: "insider", label: "Insider discount" },
  { id: "preorder", label: "Pre-order" },
  { id: "checker", label: "Price checker" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const GROUPS: { id: CouponGroup | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "CODE", label: "Codes customers type" },
  { id: "AUTO", label: "Automatic offers" },
  { id: "FREE_ITEM", label: "Free item offers" },
  { id: "CREDIT", label: "Personal credits" },
];

const APPLIES_TO = {
  ORDERS: "Normal orders",
  PREORDERS: "Pre-orders",
  BOTH: "Both",
} as const;

const STATE: Record<CouponState, { label: string; tone: StatusTone }> = {
  LIVE: { label: "Live", tone: "success" },
  SCHEDULED: { label: "Starts later", tone: "pending" },
  ENDED: { label: "Ended", tone: "problem" },
  OFF: { label: "Paused", tone: "problem" },
  USED_UP: { label: "Used up", tone: "problem" },
};

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; group?: string }>;
}) {
  const staff = await requirePageSession("coupon:create");
  const params = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === params.tab)
    ? (params.tab as TabId)
    : "coupons";
  const can = (key: string) => hasPermission(staff.permissions, key);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Coupons and discounts"
        description="Every way a price can come down: coupons, the Insider discount and the pre-order. Use the price checker to see what a customer would pay."
        actions={
          tab === "coupons" ? (
            <LinkButton href="/coupons/new">Add coupon</LinkButton>
          ) : undefined
        }
      />
      <AdminTabLinks basePath="/coupons" tabs={TABS} active={tab} />
      {tab === "coupons" ? <CouponsTab group={params.group} /> : null}
      {tab === "insider" ? (
        <InsiderDiscountTab canManage={can("waitlist:manage")} />
      ) : null}
      {tab === "preorder" ? (
        <PreorderTab
          canManage={can("coupon:update")}
          canAskBalance={can("order:updateStatus")}
        />
      ) : null}
      {tab === "checker" ? <CheckerTab /> : null}
    </main>
  );
}

async function CheckerTab() {
  const items = (await listGiftableItems()).filter((i) => !i.giftOnly);
  return (
    <PriceChecker items={items.map((i) => ({ id: i.id, name: i.name }))} />
  );
}

async function CouponsTab({ group }: { group?: string }) {
  const all = await listCouponsForAdmin();
  const active = GROUPS.some((g) => g.id === group)
    ? (group as CouponGroup | "ALL")
    : "ALL";
  const coupons =
    active === "ALL" ? all : all.filter((c) => c.group === active);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const count =
            g.id === "ALL"
              ? all.length
              : all.filter((c) => c.group === g.id).length;
          return (
            <Link
              key={g.id}
              href={`/coupons?tab=coupons&group=${g.id}`}
              className={`rounded-full px-4 py-2 text-sm ${
                g.id === active
                  ? "bg-onwei-blue text-onwei-beige"
                  : "border border-onwei-blue/30 text-onwei-blue hover:border-onwei-blue"
              }`}
            >
              {g.label} ({count})
            </Link>
          );
        })}
      </div>
      {coupons.length === 0 ? (
        <EmptyState
          title={active === "ALL" ? "No coupons yet" : "None of this type yet"}
          description={
            active === "CREDIT"
              ? "Personal credits are made when a pre-order is cancelled."
              : "Create one to give customers a code at checkout."
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Code</AdminTableHeaderCell>
            <AdminTableHeaderCell>Gives</AdminTableHeaderCell>
            <AdminTableHeaderCell>Works on</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Used</AdminTableHeaderCell>
            <AdminTableHeaderCell>Given away</AdminTableHeaderCell>
            <AdminTableHeaderCell>Ends</AdminTableHeaderCell>
            <AdminTableHeaderCell>
              <span className="sr-only">Actions</span>
            </AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {coupons.map((c) => (
              <AdminTableRow key={c.id}>
                <AdminTableCell>
                  <Link
                    href={`/coupons/${c.id}`}
                    className="font-mono font-semibold underline-offset-2 hover:underline"
                  >
                    {c.code}
                  </Link>
                  {c.autoApply ? (
                    <span className="block text-xs text-onwei-blue/60">
                      Applies by itself
                    </span>
                  ) : null}
                </AdminTableCell>
                <AdminTableCell>{c.summary}</AdminTableCell>
                <AdminTableCell>{APPLIES_TO[c.appliesTo]}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={STATE[c.state].tone}>
                    {STATE[c.state].label}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  {c.uses}
                  {c.usageLimit !== null ? ` of ${c.usageLimit}` : ""}
                </AdminTableCell>
                <AdminTableCell>
                  {formatCurrency(c.totalDiscount)}
                </AdminTableCell>
                <AdminTableCell>
                  {c.endsAt
                    ? c.endsAt.toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })
                    : "-"}
                </AdminTableCell>
                <AdminTableCell>
                  <CouponRowActions
                    couponId={c.id}
                    code={c.code}
                    isActive={c.isActive}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
