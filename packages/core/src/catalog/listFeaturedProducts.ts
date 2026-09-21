import { prisma } from "@onwei/database";
import { mapToListItem } from "./mapProduct";
import type { ProductListItem } from "./types";

/**
 * Backs the Homepage product grid. There's no `isFeatured`/homepage-ordering
 * field in the schema, so this is a placeholder curation strategy (newest
 * active products first), not real merchandising control. Adding a real
 * featured flag would need its own schema change and Plan Mode round.
 */
export async function listFeaturedProducts(
  limit = 3,
): Promise<ProductListItem[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
    },
  });

  return products.map(mapToListItem);
}
