import type { ProductImageDTO, ProductListItem } from "./types";

export type ProductSort = "featured" | "price-asc" | "price-desc";

/** Converts a Prisma Decimal (rupees) to an integer paise count for formatCurrency. */
export function toMinorUnits(
  decimalRupees: { toNumber(): number } | number,
): number {
  const rupees =
    typeof decimalRupees === "number"
      ? decimalRupees
      : decimalRupees.toNumber();
  return Math.round(rupees * 100);
}

/** Min/max price across a product's variants, in minor units. */
export function derivePriceRangeMinorUnits(
  variants: readonly { priceMinorUnits: number }[],
): { min: number; max: number } {
  const prices = variants.map((v) => v.priceMinorUnits);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** True if net stock (on hand minus reserved) is positive across any warehouse. */
export function deriveInStock(
  inventoryRows: readonly {
    quantityOnHand: number;
    quantityReserved: number;
  }[],
): boolean {
  const net = inventoryRows.reduce(
    (sum, row) => sum + (row.quantityOnHand - row.quantityReserved),
    0,
  );
  return net > 0;
}

/**
 * Prefers the first non-placeholder image (an admin-uploaded photo), falling
 * back to the first image overall (a placeholder), or null if there are none.
 * Assumes `images` is already ordered by ProductImage.sortOrder.
 */
export function pickLeadImage(
  images: readonly ProductImageDTO[],
): ProductImageDTO | null {
  if (images.length === 0) return null;
  return images.find((image) => !image.isPlaceholder) ?? images[0] ?? null;
}

/**
 * Collection page "SORT BY" (Figma frame "Collection", node 760:3925).
 * "featured" reuses the same "no real curation field, so newest-first"
 * convention as listFeaturedProducts — the DB query already orders by
 * createdAt desc, so this only needs to re-sort for the two price options.
 * Sorted in JS, not via Prisma orderBy, since price is a derived min/max
 * across a product's variants rather than a single column.
 */
export function sortProductList(
  products: ProductListItem[],
  sort: ProductSort,
): ProductListItem[] {
  if (sort === "featured") return products;
  const direction = sort === "price-asc" ? 1 : -1;
  return [...products].sort(
    (a, b) =>
      (a.priceRangeMinorUnits.min - b.priceRangeMinorUnits.min) * direction,
  );
}
