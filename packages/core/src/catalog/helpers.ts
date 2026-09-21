import type { ProductImageDTO } from "./types";

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
