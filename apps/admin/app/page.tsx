import Link from "next/link";
import { listInventory } from "@onwei/core";
import { prisma } from "@onwei/database";

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
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {!hasAnyData ? (
        <p className="text-neutral-600">
          Nothing to show yet — once you add a category and a product,
          you&apos;ll see them here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">Live products</p>
            <p className="text-3xl font-semibold">{activeProducts}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">Visible categories</p>
            <p className="text-3xl font-semibold">{categories}</p>
          </div>
          <Link
            href="/inventory?lowStockOnly=true"
            className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            <p className="text-sm text-neutral-500">Running low on stock</p>
            <p className="text-3xl font-semibold">{lowStockCount}</p>
          </Link>
        </div>
      )}
    </main>
  );
}
