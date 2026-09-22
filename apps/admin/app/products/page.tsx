import Link from "next/link";
import { deriveInStock } from "@onwei/core";
import { prisma } from "@onwei/database";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Live",
  ARCHIVED: "Discontinued",
};

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { category: true, variants: { include: { inventory: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link
          href="/products/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Add a product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-neutral-600">
          No products yet — add your first one.
        </p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const inStock = product.variants.some((variant) =>
                deriveInStock(variant.inventory),
              );
              return (
                <tr key={product.id} className="border-b border-neutral-100">
                  <td className="px-4 py-2">{product.name}</td>
                  <td className="px-4 py-2">{product.category.name}</td>
                  <td className="px-4 py-2">
                    {STATUS_LABELS[product.status] ?? product.status}
                  </td>
                  <td className="px-4 py-2">
                    {product.variants.length === 0
                      ? "No variants yet"
                      : inStock
                        ? "In stock"
                        : "Out of stock"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-neutral-700 underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
