import Link from "next/link";
import { prisma } from "@onwei/database";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Link
          href="/categories/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Add a category
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-neutral-600">
          No categories yet — add your first one to start organizing products.
        </p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Products</th>
              <th className="px-4 py-2 font-medium">Visible on site</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-neutral-100">
                <td className="px-4 py-2">{category.name}</td>
                <td className="px-4 py-2">{category._count.products}</td>
                <td className="px-4 py-2">
                  {category.isActive ? "Yes" : "No"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/categories/${category.id}`}
                    className="text-neutral-700 underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
