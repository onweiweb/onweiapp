import { prisma } from "@onwei/database";
import { mapSpecs } from "./mapProduct";
import { toMinorUnits } from "./helpers";
import type { ComparisonProduct } from "./types";

/**
 * Sibling products (same category, excludes self, ACTIVE only) for the PDP
 * comparison table — a lighter query than `listRelatedProducts` since the
 * table only needs specs/price/lead image, not review summaries or stock.
 */
export async function listComparableProducts(
  productId: string,
  limit = 2,
): Promise<ComparisonProduct[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, specs: true },
  });
  if (!product) return [];

  const currentLabels = new Set(
    mapSpecs(product.specs).map((spec) => spec.label),
  );
  if (currentLabels.size === 0) return [];

  // Category is a coarse grouping (Pickleball holds paddles *and* apparel),
  // so a same-category sibling isn't necessarily comparable — a polo's
  // single "Fabric" spec doesn't line up against a paddle's core/sweet-spot
  // table just because both happen to have *some* specs. Over-fetch and
  // keep only siblings whose spec labels actually overlap with this
  // product's, rather than trusting category (or a bare specs.length > 0
  // check) alone.
  const candidates = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: productId },
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: limit * 5,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        where: { status: "ACTIVE" },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
  });

  const comparable: ComparisonProduct[] = [];
  for (const sibling of candidates) {
    const specs = mapSpecs(sibling.specs);
    const variant = sibling.variants[0];
    const sharedLabels = specs.filter((spec) =>
      currentLabels.has(spec.label),
    ).length;
    // At least half of this product's spec rows need to line up, or the
    // comparison table ends up mostly "—" for one column.
    if (!variant || sharedLabels < currentLabels.size / 2) continue;
    comparable.push({
      slug: sibling.slug,
      name: sibling.name,
      priceMinorUnits: toMinorUnits(variant.price),
      imageUrl: sibling.images[0]?.url ?? null,
      specs,
    });
    if (comparable.length >= limit) break;
  }
  return comparable;
}
