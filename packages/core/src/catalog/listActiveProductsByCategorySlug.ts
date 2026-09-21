import { prisma } from "@onwei/database";
import { mapToListItem } from "./mapProduct";
import type { CategorySummary, ProductListItem } from "./types";

/**
 * Products visible on the storefront for a category, excluding DRAFT and
 * ARCHIVED products (not just DRAFT — the defensible reading of
 * "discontinued") and soft-deleted ones. Returns null if the category
 * doesn't exist or isn't active.
 */
export async function listActiveProductsByCategorySlug(
  categorySlug: string,
): Promise<{ category: CategorySummary; products: ProductListItem[] } | null> {
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, isActive: true },
  });
  if (!category) return null;

  const products = await prisma.product.findMany({
    where: { categoryId: category.id, status: "ACTIVE", deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
    },
  });

  return {
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
    },
    products: products.map(mapToListItem),
  };
}
