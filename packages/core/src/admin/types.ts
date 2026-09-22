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

export interface CreateProductInput {
  name: string;
  slug: string;
  categoryId: string;
  description?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
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
