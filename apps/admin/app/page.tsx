import Link from "next/link";
import { Suspense } from "react";
import { traffic } from "./analytics/_data";
import { getWaitlistStats, listInventory } from "@onwei/core";
import { prisma } from "@onwei/database";
import { hasPermission } from "@onwei/auth";
import { requirePageSession } from "./_lib/requirePageSession";
import { AdminCard, PageHeader } from "./_components/ui";

type Visitors = { uniqueVisitors: number; totalViews: number } | null;

// `undefined` means still loading, `null` means not available.
function VisitorsCard({ visitors }: { visitors: Visitors | undefined }) {
  return (
    <Stat
      label="Visitors this week"
      href="/analytics"
      value={
        visitors === undefined
          ? "..."
          : visitors
            ? visitors.uniqueVisitors
            : "-"
      }
      note={
        visitors === undefined
          ? "Loading"
          : visitors
            ? `${visitors.totalViews} page views`
            : "Not connected yet. Open to set it up."
      }
    />
  );
}

// Streams in after the rest of the dashboard, so a slow or down tracking
// service never delays or breaks it.
async function VisitorsThisWeek() {
  const visitors = await traffic({
    days: 7,
    page: { kind: "all" },
    ownHost: null,
  })
    .then((r) => r.data)
    .catch(() => null);
  return <VisitorsCard visitors={visitors} />;
}

async function getDashboardCounts(permissions: string[]) {
  const can = (key: string) => hasPermission(permissions, key);
  const [
    activeProducts,
    categories,
    lowStock,
    waitlist,
    newOrders,
    openReturns,
    pendingReviews,
    openRequests,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.category.count({ where: { isActive: true } }),
    listInventory({ lowStockOnly: true }),
    getWaitlistStats(),
    can("order:view")
      ? prisma.order.count({ where: { status: "PENDING" } })
      : null,
    can("return:view")
      ? prisma.returnRequest.count({ where: { status: "REQUESTED" } })
      : null,
    can("review:moderate")
      ? prisma.review.count({ where: { isApproved: false } })
      : null,
    can("dsr:view")
      ? prisma.dataSubjectRequest.count({
          where: { status: { in: ["RECEIVED", "IN_PROGRESS"] } },
        })
      : null,
  ]);
  return {
    activeProducts,
    categories,
    lowStockCount: lowStock.length,
    waitlist,
    newOrders,
    openReturns,
    pendingReviews,
    openRequests,
  };
}

function Stat({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  href?: string;
}) {
  const card = (
    <AdminCard
      className={`h-full !rounded-[20px] !p-4 ${href ? "transition-colors hover:border-onwei-purple" : ""}`}
    >
      <p className="text-xs uppercase tracking-wide text-onwei-blue/70">
        {label}
      </p>
      <p className="text-2xl font-semibold">{value}</p>
      {note ? <p className="text-xs text-onwei-blue/70">{note}</p> : null}
    </AdminCard>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}

export default async function DashboardPage() {
  const { permissions } = await requirePageSession();
  const counts = await getDashboardCounts(permissions);
  const { activeProducts, categories, lowStockCount, waitlist } = counts;

  const hasAnyData = activeProducts > 0 || categories > 0 || waitlist.total > 0;

  // Things staff should act on, shown only when there is something to do and
  // only to people allowed to act on them.
  const attention = [
    {
      count: counts.newOrders,
      label: "new orders waiting to be confirmed",
      href: "/orders",
    },
    {
      count: counts.openReturns,
      label: "return requests to review",
      href: "/returns",
    },
    {
      count: counts.pendingReviews,
      label: "reviews waiting for approval",
      href: "/reviews?isApproved=false",
    },
    {
      count: counts.openRequests,
      label: "customer data requests still open",
      href: "/dsr",
    },
    {
      count: lowStockCount,
      label: "items running low on stock",
      href: "/inventory?lowStockOnly=true",
    },
  ].filter((item) => item.count !== null && item.count > 0);

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description="What needs your attention, and how the store looks today."
      />

      {!hasAnyData ? (
        <p className="text-onwei-blue/70">
          Nothing to show yet, once you add a category and a product,
          you&apos;ll see them here.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-onwei-blue/70">
              Needs your attention
            </h2>
            {attention.length === 0 ? (
              <div className="rounded-[20px] border border-onwei-blue/10 bg-onwei-white px-5 py-4 text-sm text-onwei-blue/70">
                All clear. Nothing is waiting on you.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {attention.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 rounded-[20px] border border-onwei-blue/10 bg-onwei-white px-5 py-4 transition-colors hover:border-onwei-purple"
                  >
                    <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-onwei-green px-2 text-lg font-semibold text-onwei-blue">
                      {item.count}
                    </span>
                    <span className="flex-1 text-sm">{item.label}</span>
                    <span aria-hidden className="text-onwei-blue/40">
                      &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-onwei-blue/70">
              Store at a glance
            </h2>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Stat
                label="Live products"
                value={activeProducts}
                href="/products"
              />
              <Stat
                label="Visible categories"
                value={categories}
                href="/categories"
              />
              <Stat
                label="On the waitlist"
                value={waitlist.active}
                note={`${waitlist.joinedLast7Days} joined this week, ${waitlist.unsubscribed} unsubscribed`}
                href="/waitlist"
              />
              <Suspense fallback={<VisitorsCard visitors={undefined} />}>
                <VisitorsThisWeek />
              </Suspense>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
