import { prisma } from "@onwei/database";
import type { CategorySummary } from "./types";
import { getStorefront, storefrontProductWhere } from "../preorders/storefront";

export async function listActiveCategories(): Promise<CategorySummary[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
    metaTitle: category.metaTitle,
    metaDescription: category.metaDescription,
  }));
}

/**
 * Category slugs to leave out of menus and collection tabs. Empty in the
 * normal shop; in pre-order mode, every category with no pre-order product.
 */
export async function listHiddenCategorySlugs(): Promise<string[]> {
  const storefront = await getStorefront();
  if (!storefront.preorderMode) return [];
  const where = await storefrontProductWhere();
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, products: { where, select: { id: true }, take: 1 } },
  });
  return categories
    .filter((category) => category.products.length === 0)
    .map((category) => category.slug);
}
