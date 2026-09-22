import Link from "next/link";
import { prisma } from "@onwei/database";
import { ProductForm } from "../../_components/ProductForm";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add a product</h1>
      {categories.length === 0 ? (
        <p className="text-neutral-600">
          You need at least one category before you can add a product —{" "}
          <Link href="/categories/new" className="underline">
            add one first
          </Link>
          .
        </p>
      ) : (
        <ProductForm mode="create" categories={categories} />
      )}
    </main>
  );
}
