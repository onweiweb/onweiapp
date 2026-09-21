import { prisma } from "@onwei/database";
import { mapImage, mapVariant } from "./mapProduct";
import type { ProductDetail } from "./types";

/**
 * Full product detail for the PDP. Returns null for DRAFT, ARCHIVED,
 * soft-deleted, or unknown slugs alike — the page layer turns null into
 * notFound().
 */
export async function getActiveProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
    },
  });
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
      imageUrl: product.category.imageUrl,
    },
    images: product.images.map(mapImage),
    variants: product.variants.map(mapVariant),
  };
}
