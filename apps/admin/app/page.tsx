import Link from "next/link";
import { Suspense } from "react";
import { traffic } from "./analytics/_data";
import { getWaitlistStats, listInventory } from "@onwei/core";
import { prisma } from "@onwei/database";
import { AdminCard } from "./_components/ui";

type Visitors = { uniqueVisitors: number; totalViews: number } | null;

// `undefined` means still loading, `null` means not available.
function VisitorsCard({ visitors }: { visitors: Visitors | undefined }) {
  return (
    <Link href="/analytics">
      <AdminCard className="transition-colors hover:border-onwei-purple">
        <p className="text-sm text-onwei-blue/70">Visitors this week</p>
        <p className="text-3xl font-semibold">
          {visitors === undefined
            ? "..."
            : visitors
              ? visitors.uniqueVisitors
              : "-"}
        </p>
        <p className="mt-1 text-xs text-onwei-blue/70">
          {visitors === undefined
            ? "Loading"
            : visitors
              ? `${visitors.totalViews} page views. See where they came from.`
              : "Not connected yet. Open to see how to set it up."}
        </p>
      </AdminCard>
    </Link>
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

async function getDashboardCounts() {
  const [activeProducts, categories, lowStock, waitlist] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.category.count({ where: { isActive: true } }),
    listInventory({ lowStockOnly: true }),
    getWaitlistStats(),
  ]);
  return {
    activeProducts,
    categories,
    lowStockCount: lowStock.length,
    waitlist,
  };
}

export default async function DashboardPage() {
  const { activeProducts, categories, lowStockCount, waitlist } =
    await getDashboardCounts();

  const hasAnyData = activeProducts > 0 || categories > 0 || waitlist.total > 0;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Dashboard
      </h1>

      {!hasAnyData ? (
        <p className="text-onwei-blue/70">
          Nothing to show yet, once you add a category and a product,
          you&apos;ll see them here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminCard>
            <p className="text-sm text-onwei-blue/70">Live products</p>
            <p className="text-3xl font-semibold">{activeProducts}</p>
          </AdminCard>
          <AdminCard>
            <p className="text-sm text-onwei-blue/70">Visible categories</p>
            <p className="text-3xl font-semibold">{categories}</p>
          </AdminCard>
          <Link href="/inventory?lowStockOnly=true">
            <AdminCard className="transition-colors hover:border-onwei-purple">
              <p className="text-sm text-onwei-blue/70">Running low on stock</p>
              <p className="text-3xl font-semibold">{lowStockCount}</p>
            </AdminCard>
          </Link>
          <Suspense fallback={<VisitorsCard visitors={undefined} />}>
            <VisitorsThisWeek />
          </Suspense>
          <Link href="/waitlist">
            <AdminCard className="transition-colors hover:border-onwei-purple">
              <p className="text-sm text-onwei-blue/70">On the waitlist</p>
              <p className="text-3xl font-semibold">{waitlist.active}</p>
              <p className="mt-1 text-xs text-onwei-blue/70">
                {waitlist.joinedLast7Days} joined in the last 7 days,{" "}
                {waitlist.unsubscribed} unsubscribed
              </p>
            </AdminCard>
          </Link>
        </div>
      )}
    </main>
  );
}
