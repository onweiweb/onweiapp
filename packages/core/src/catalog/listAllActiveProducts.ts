import { prisma } from "@onwei/database";
import { mapToListItem } from "./mapProduct";
import type { ProductListItem } from "./types";

/**
 * Every storefront-visible product across all categories — backs "Shop All"
 * / /collection/all, since there's no "All" Category row in the schema.
 */
export async function listAllActiveProducts(): Promise<ProductListItem[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
    },
  });

  return products.map(mapToListItem);
}
