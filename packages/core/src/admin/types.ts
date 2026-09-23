export interface AuditActor {
  staffUserId: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface CreateFaqInput {
  productId?: string | null;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateFaqInput = Partial<CreateFaqInput>;

export interface ProductSpecInput {
  label: string;
  value: string;
}

export interface CreateProductInput {
  name: string;
  slug: string;
  categoryId: string;
  description?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  specs?: ProductSpecInput[] | null;
  whoThisIsFor?: string | null;
  careInstructions?: string | null;
  powerRating?: number | null;
  spinRating?: number | null;
  controlRating?: number | null;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CreateProductVariantInput {
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  compareAtPrice?: number | null;
  weightGrams?: number | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export type UpdateProductVariantInput = Partial<
  Omit<CreateProductVariantInput, "productId">
>;

export type InventoryAdjustmentReason = "RESTOCK" | "RETURN" | "ADJUSTMENT";

export interface AdjustInventoryInput {
  productVariantId: string;
  warehouseId: string;
  delta: number;
  reason: InventoryAdjustmentReason;
}

export interface CreateValuePropInput {
  illustrationUrl: string;
  width: number;
  height: number;
  title: string;
  body: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateValuePropInput = Partial<CreateValuePropInput>;

export interface CreateInstagramPhotoInput {
  imageUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateInstagramPhotoInput = Partial<CreateInstagramPhotoInput>;

export interface CreateMarqueeItemInput {
  placement: "HOME_HERO" | "HOME_SHOWCASE" | "PDP";
  label: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateMarqueeItemInput = Partial<CreateMarqueeItemInput>;
