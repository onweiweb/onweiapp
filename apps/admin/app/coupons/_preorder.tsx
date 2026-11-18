import {
  formatCurrency,
  getPreorderCampaignForAdmin,
  getPreorderOverview,
  getSiteSetting,
  istDateOf,
  listGiftableItems,
  tierState,
  type PreorderCampaignInput,
} from "@onwei/core";
import { prisma } from "@onwei/database";
import Link from "next/link";
import {
  AdminBadge,
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
} from "../_components/ui";
import {
  DEFAULT_CAMPAIGN,
  PreorderCampaignForm,
} from "./_components/PreorderCampaignForm";
import { StockInButton } from "./_components/StockInButton";

const STATE_LABEL = { CLOSED: "Over", LIVE: "Live now", LOCKED: "Coming up" };
const STATE_TONE = {
  CLOSED: "problem",
  LIVE: "success",
  LOCKED: "pending",
} as const;

/** Coupons and discounts > Pre-order. */
export async function PreorderTab({
  canManage,
  canAskBalance,
}: {
  canManage: boolean;
  canAskBalance: boolean;
}) {
  const [campaign, products, gifts, site] = await Promise.all([
    getPreorderCampaignForAdmin(),
    prisma.product.findMany({
      where: { deletedAt: null, giftOnly: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    listGiftableItems(),
    getSiteSetting(),
  ]);
  const overview = campaign ? await getPreorderOverview(campaign.id) : null;
  const initial: PreorderCampaignInput = campaign
    ? {
        name: campaign.name,
        isActive: campaign.isActive,
        startDate: istDateOf(campaign.startsAt),
        reserveAmount: campaign.reserveAmount / 100,
        expectedShipDate: campaign.expectedShipDate
          ? istDateOf(campaign.expectedShipDate)
          : null,
        productIds: campaign.productIds,
        insiderGiftVariantId: campaign.insiderGiftVariantId,
        tiers: campaign.tiers.map((t) => ({
          label: t.label,
          days: t.days,
          percent: t.percent,
          giftVariantId: t.giftVariantId,
          giftLabel: t.giftLabel,
        })),
      }
    : DEFAULT_CAMPAIGN(istDateOf(new Date()));

  return (
    <div className="flex flex-col gap-6">
      <AdminCard className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-onwei-blue">How it works</h2>
        <ol className="list-decimal pl-5 text-sm text-onwei-blue/80">
          <li>
            Customers reserve a product and pay the amount below per item. The
            live tier&apos;s discount and gift are locked in.
          </li>
          <li>
            When stock arrives, press &ldquo;Stock is in&rdquo; for that
            product. The oldest reservations get a link to pay the rest.
          </li>
          <li>
            Reminders go out after 3 and 7 days. After 14 days unpaid, the
            amount paid becomes credit for a year.
          </li>
          <li>
            A customer can cancel before paying the balance and keep the amount
            as credit for a year.
          </li>
        </ol>
        {site.siteMode !== "PREORDERS" ? (
          <p className="text-sm font-semibold text-onwei-blue">
            The site is in {site.siteMode === "LIVE" ? "live shop" : "waitlist"}{" "}
            mode, so customers can&apos;t reserve yet. Switch to pre-order mode
            in{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>
            .
          </p>
        ) : null}
      </AdminCard>

      {campaign ? (
        <AdminCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-onwei-blue">
              How it&apos;s going
            </h2>
            <Link href="/orders?kind=PREORDER" className="text-sm underline">
              See every pre-order
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Number label="Pre-orders" value={String(overview?.orders ?? 0)} />
            <Number
              label="Items reserved"
              value={String(overview?.units ?? 0)}
            />
            <Number
              label="Paid so far (reserves)"
              value={formatCurrency(overview?.reserveCollected ?? 0)}
            />
            <Number
              label="Balance still to come"
              value={formatCurrency(overview?.balanceOutstanding ?? 0)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {campaign.tiers.map((tier) => {
              const state = tierState(tier);
              const counts = overview?.byTier.find(
                (t) => t.label === tier.label,
              );
              return (
                <div
                  key={tier.id}
                  className="rounded-[20px] border border-onwei-blue/15 px-4 py-3"
                >
                  <p className="flex items-center gap-2 font-semibold text-onwei-blue">
                    {tier.label} · {tier.percent}% off
                    <AdminBadge tone={STATE_TONE[state]}>
                      {STATE_LABEL[state]}
                    </AdminBadge>
                  </p>
                  <p className="text-sm text-onwei-blue/70">
                    {istDateOf(tier.startsAt)} to{" "}
                    {istDateOf(new Date(tier.endsAt.getTime() - 1))} ·{" "}
                    {counts?.orders ?? 0} pre-orders, {counts?.units ?? 0} items
                  </p>
                </div>
              );
            })}
          </div>
        </AdminCard>
      ) : null}

      {overview && overview.products.length > 0 ? (
        <AdminCard className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-onwei-blue">
              Stock and balance
            </h2>
            <p className="text-sm text-onwei-blue/70">
              Add the stock in Inventory first, then ask for the balance here.
            </p>
          </div>
          {overview.products.map((p) => (
            <div
              key={p.productId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-onwei-blue/10 pb-3 last:border-b-0"
            >
              <div>
                <p className="font-semibold text-onwei-blue">{p.name}</p>
                <p className="text-sm text-onwei-blue/70">
                  {p.waiting} waiting · {p.stock} in stock
                </p>
              </div>
              {canAskBalance ? (
                <StockInButton
                  productId={p.productId}
                  name={p.name}
                  waiting={p.waiting}
                  stock={p.stock}
                />
              ) : null}
            </div>
          ))}
          <DemandTable title="By size and colour" rows={overview.items} />
          {overview.gifts.length ? (
            <DemandTable title="Free gifts owed" rows={overview.gifts} />
          ) : null}
        </AdminCard>
      ) : campaign ? (
        <EmptyState
          title="No reservations yet"
          description="Numbers show up here once customers start reserving."
        />
      ) : null}

      <PreorderCampaignForm
        campaignId={campaign?.id ?? null}
        initial={initial}
        products={products}
        gifts={gifts}
        canManage={canManage}
      />
    </div>
  );
}

function Number({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-onwei-beige/60 p-4">
      <p className="text-sm text-onwei-blue/70">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-onwei-blue">{value}</p>
    </div>
  );
}

function DemandTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    variantId: string;
    name: string;
    variantLabel: string;
    waiting: number;
    asked: number;
    paid: number;
    stock: number;
  }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-onwei-blue">{title}</h3>
      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>Item</AdminTableHeaderCell>
          <AdminTableHeaderCell>Waiting for stock</AdminTableHeaderCell>
          <AdminTableHeaderCell>Asked to pay</AdminTableHeaderCell>
          <AdminTableHeaderCell>Paid</AdminTableHeaderCell>
          <AdminTableHeaderCell>In stock now</AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {rows.map((r) => (
            <AdminTableRow key={r.variantId}>
              <AdminTableCell>
                {r.name}
                {r.variantLabel ? (
                  <span className="text-onwei-blue/60">
                    {" "}
                    · {r.variantLabel}
                  </span>
                ) : null}
              </AdminTableCell>
              <AdminTableCell>{r.waiting}</AdminTableCell>
              <AdminTableCell>{r.asked}</AdminTableCell>
              <AdminTableCell>{r.paid}</AdminTableCell>
              <AdminTableCell>{r.stock}</AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}
