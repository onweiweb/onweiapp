import Link from "next/link";
import { listInventory } from "@onwei/core";
import { prisma } from "@onwei/database";
import { AdminCard } from "./_components/ui";

async function getDashboardCounts() {
  const [activeProducts, categories, lowStock] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.category.count({ where: { isActive: true } }),
    listInventory({ lowStockOnly: true }),
  ]);
  return { activeProducts, categories, lowStockCount: lowStock.length };
}

export default async function DashboardPage() {
  const { activeProducts, categories, lowStockCount } =
    await getDashboardCounts();

  const hasAnyData = activeProducts > 0 || categories > 0;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Dashboard
      </h1>

      {!hasAnyData ? (
        <p className="text-onwei-blue/70">
          Nothing to show yet — once you add a category and a product,
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
        </div>
      )}
    </main>
  );
}
