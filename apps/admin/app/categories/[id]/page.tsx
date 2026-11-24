import { PageHeader } from "../../_components/ui";
import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { CategoryForm } from "../../_components/CategoryForm";
import { CategoryReturnableToggle } from "../../_components/ProductCommerceForm";
import { CategoryShipperBoxForm } from "../../_components/CategoryShipperBoxForm";

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
      <PageHeader
        title={<>Edit {category.name}</>}
        back={{ href: "/categories", label: "Categories" }}
      />
      <CategoryForm
        mode="edit"
        categoryId={category.id}
        initial={{
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
          metaTitle: category.metaTitle ?? "",
          metaDescription: category.metaDescription ?? "",
        }}
      />
      <CategoryShipperBoxForm
        categoryId={category.id}
        initial={{
          lengthCm: category.boxLengthCm?.toString() ?? "",
          widthCm: category.boxWidthCm?.toString() ?? "",
          heightCm: category.boxHeightCm?.toString() ?? "",
          weightGrams: category.boxWeightGrams?.toString() ?? "",
        }}
      />
      <CategoryReturnableToggle
        categoryId={category.id}
        initial={category.isReturnable}
      />
    </main>
  );
}
