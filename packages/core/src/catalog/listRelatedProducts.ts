import { prisma } from "@onwei/database";
import { mapToListItem } from "./mapProduct";
import type { ProductListItem } from "./types";

/**
 * "You may also like" / comparison-table siblings — same category, excludes
 * the product itself, ACTIVE + not soft-deleted only. Derived from the
 * existing Category relation rather than a new join table: no curation
 * concept exists yet, and "same category" is a reasonable, honest default.
 */
export async function listRelatedProducts(
  productId: string,
  limit = 3,
): Promise<ProductListItem[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true },
  });
  if (!product) return [];

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: productId },
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
  });

  return related.map(mapToListItem);
}
