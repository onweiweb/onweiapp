import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { ProductForm } from "../../_components/ProductForm";
import { VariantManager } from "../../_components/VariantManager";
import { ImageManager } from "../../_components/ImageManager";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <main className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Edit {product.name}</h1>
        <ProductForm
          mode="edit"
          productId={product.id}
          categories={categories}
          initial={{
            name: product.name,
            slug: product.slug,
            categoryId: product.categoryId,
            description: product.description ?? "",
            status: product.status,
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Photos</h2>
        <ImageManager productId={product.id} images={product.images} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Variants</h2>
        <VariantManager
          productId={product.id}
          variants={product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            attributes: variant.attributes as Record<string, string>,
            price: variant.price.toString(),
            status: variant.status,
          }))}
        />
      </div>
    </main>
  );
}
