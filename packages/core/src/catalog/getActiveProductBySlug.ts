import { prisma } from "@onwei/database";
import { mapImage, mapSpecs, mapVariant } from "./mapProduct";
import type { PlayCharacteristics, ProductDetail } from "./types";

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

  const playCharacteristics: PlayCharacteristics | null =
    product.powerRating != null &&
    product.spinRating != null &&
    product.controlRating != null
      ? {
          power: product.powerRating,
          spin: product.spinRating,
          control: product.controlRating,
        }
      : null;

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
    specs: mapSpecs(product.specs),
    whoThisIsFor: product.whoThisIsFor,
    careInstructions: product.careInstructions,
    playCharacteristics,
    highlightTags: product.highlightTags,
  };
}
