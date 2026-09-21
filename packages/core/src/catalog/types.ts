export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface ProductImageDTO {
  url: string;
  altText: string | null;
  isPlaceholder: boolean;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  image: ProductImageDTO | null;
  priceRangeMinorUnits: { min: number; max: number };
  inStock: boolean;
}

export interface ProductVariantDTO {
  id: string;
  sku: string;
  // Seed data controls the shape of the underlying JSON — cast at the query
  // boundary, not validated here.
  attributes: Record<string, string>;
  priceMinorUnits: number;
  compareAtPriceMinorUnits: number | null;
  inStock: boolean;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: CategorySummary;
  images: ProductImageDTO[];
  variants: ProductVariantDTO[];
}
