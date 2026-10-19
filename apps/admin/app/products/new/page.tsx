import { EmptyState, LinkButton, PageHeader } from "../../_components/ui";
import { prisma } from "@onwei/database";
import { ProductForm } from "../../_components/ProductForm";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Add a product"
        back={{ href: "/products", label: "Products" }}
        description="Fill in the basics now. You can add photos and variants right after."
      />
      {categories.length === 0 ? (
        <EmptyState
          title="Add a category first"
          description="Every product belongs to a category, so you need at least one before adding a product."
          action={
            <LinkButton href="/categories/new">Add a category</LinkButton>
          }
        />
      ) : (
        <ProductForm mode="create" categories={categories} />
      )}
    </main>
  );
}
