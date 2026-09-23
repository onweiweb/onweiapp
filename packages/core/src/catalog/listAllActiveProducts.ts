import { prisma } from "@onwei/database";
import { mapToListItem } from "./mapProduct";
import { sortProductList } from "./helpers";
import type { ProductSort } from "./helpers";
import type { ProductListItem } from "./types";

/**
 * Every storefront-visible product across all categories — backs "Shop All"
 * / /collection/all, since there's no "All" Category row in the schema.
 */
export async function listAllActiveProducts(
  sort: ProductSort = "featured",
): Promise<ProductListItem[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
  });

  return sortProductList(products.map(mapToListItem), sort);
}
