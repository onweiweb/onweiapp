import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { CategoryForm } from "../../_components/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit {category.name}</h1>
      <CategoryForm
        mode="edit"
        categoryId={category.id}
        initial={{
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
        }}
      />
    </main>
  );
}
