import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { DEFAULT_SURFACE_LIMITS } from "@onwei/core";
import { ProductForm } from "../../_components/ProductForm";
import { VariantManager } from "../../_components/VariantManager";
import { ImageManager } from "../../_components/ImageManager";
import { ReviewPlacementManager } from "../../_components/ReviewPlacementManager";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, approvedReviews, placements, surfaceConfig] =
    await Promise.all([
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
      prisma.review.findMany({
        where: { targetType: "PRODUCT", productId: id, isApproved: true },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.reviewPlacement.findMany({
        where: { surface: "PRODUCT_WALL", productId: id },
        include: { review: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.reviewSurfaceConfig.findUnique({
        where: { surface: "PRODUCT_WALL" },
      }),
    ]);
  if (!product) notFound();

  const featuredReviewIds = new Set(placements.map((p) => p.reviewId));

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
            specs: Array.isArray(product.specs)
              ? (product.specs as { label: string; value: string }[])
              : [],
            whoThisIsFor: product.whoThisIsFor ?? "",
            careInstructions: product.careInstructions ?? "",
            powerRating: product.powerRating?.toString() ?? "",
            spinRating: product.spinRating?.toString() ?? "",
            controlRating: product.controlRating?.toString() ?? "",
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Photos</h2>
        <ImageManager productId={product.id} images={product.images} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Featured reviews</h2>
        <ReviewPlacementManager
          surface="PRODUCT_WALL"
          productId={product.id}
          placements={placements.map((p) => ({
            placementId: p.id,
            reviewId: p.reviewId,
            rating: p.review.rating,
            title: p.review.title,
            body: p.review.body,
            authorDisplay: p.review.authorDisplay,
          }))}
          candidates={approvedReviews
            .filter((review) => !featuredReviewIds.has(review.id))
            .map((review) => ({
              id: review.id,
              rating: review.rating,
              title: review.title,
              body: review.body,
              authorDisplay: review.authorDisplay,
            }))}
          limit={surfaceConfig?.limit ?? DEFAULT_SURFACE_LIMITS.PRODUCT_WALL}
        />
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
