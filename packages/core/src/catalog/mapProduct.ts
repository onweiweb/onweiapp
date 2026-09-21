import {
  derivePriceRangeMinorUnits,
  deriveInStock,
  pickLeadImage,
  toMinorUnits,
} from "./helpers";
import type {
  ProductImageDTO,
  ProductListItem,
  ProductVariantDTO,
} from "./types";

/**
 * Structural shape this module needs from a Prisma `Product` query result —
 * not a Prisma.ProductGetPayload<...> generic, so callers stay decoupled
 * from the exact `include` shape as long as it fetches these fields.
 */
export interface ProductWithCatalogRelations {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: readonly {
    url: string;
    altText: string | null;
    isPlaceholder: boolean;
  }[];
  variants: readonly {
    id: string;
    sku: string;
    attributes: unknown;
    price: { toNumber(): number };
    compareAtPrice: { toNumber(): number } | null;
    inventory: readonly { quantityOnHand: number; quantityReserved: number }[];
  }[];
}

export function mapImage(image: {
  url: string;
  altText: string | null;
  isPlaceholder: boolean;
}): ProductImageDTO {
  return {
    url: image.url,
    altText: image.altText,
    isPlaceholder: image.isPlaceholder,
  };
}

export function mapVariant(
  variant: ProductWithCatalogRelations["variants"][number],
): ProductVariantDTO {
  return {
    id: variant.id,
    sku: variant.sku,
    attributes: variant.attributes as Record<string, string>,
    priceMinorUnits: toMinorUnits(variant.price),
    compareAtPriceMinorUnits: variant.compareAtPrice
      ? toMinorUnits(variant.compareAtPrice)
      : null,
    inStock: deriveInStock(variant.inventory),
  };
}

export function mapToListItem(
  product: ProductWithCatalogRelations,
): ProductListItem {
  const images = product.images.map(mapImage);
  const variants = product.variants.map(mapVariant);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: pickLeadImage(images),
    priceRangeMinorUnits: derivePriceRangeMinorUnits(variants),
    inStock: variants.some((variant) => variant.inStock),
  };
}
