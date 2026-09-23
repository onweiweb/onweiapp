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
  // null when the product has no approved reviews yet — the card shows no
  // rating row at all rather than a fake/invented count.
  reviewSummary: ReviewSummary | null;
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

export interface ProductSpec {
  label: string;
  value: string;
}

export interface PlayCharacteristics {
  power: number;
  spin: number;
  control: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: CategorySummary;
  images: ProductImageDTO[];
  variants: ProductVariantDTO[];
  specs: ProductSpec[];
  whoThisIsFor: string | null;
  careInstructions: string | null;
  // null unless power/spin/control are all set — a category like Pilates
  // simply never has this data, so the section it drives never renders.
  playCharacteristics: PlayCharacteristics | null;
  highlightTags: string[];
}

export interface ReviewListItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorDisplay: string | null;
  submittedAt: Date;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/** One column of the PDP comparison table — lighter than `ProductDetail`,
 * just what the table needs to render a sibling product's specs. */
export interface ComparisonProduct {
  slug: string;
  name: string;
  priceMinorUnits: number;
  imageUrl: string | null;
  specs: ProductSpec[];
}

export interface ValuePropItem {
  illustration: string;
  width: number;
  height: number;
  title: string;
  body: string;
}

export interface InstagramPhotoItem {
  url: string;
  altText: string | null;
}
