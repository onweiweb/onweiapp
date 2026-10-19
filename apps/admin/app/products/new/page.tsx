import { PageHeader } from "../../_components/ui";
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
      <PageHeader
        title="Add a product"
        back={{ href: "/products", label: "Products" }}
        description="Add a product, then add its variants and images."
      />
      {categories.length === 0 ? (
        <p className="text-neutral-600">
          You need at least one category before you can add a product -{" "}
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
