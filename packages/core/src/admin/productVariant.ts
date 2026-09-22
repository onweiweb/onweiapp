import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type {
  AuditActor,
  CreateProductVariantInput,
  UpdateProductVariantInput,
} from "./types";

// Decimal fields need explicit string conversion before the JSON round-trip
// in writeAuditLog — Prisma's Decimal.toJSON() already returns a string, but
// being explicit here also handles the nullable compareAtPrice safely.
function serializeVariant(variant: {
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  [key: string]: unknown;
}) {
  return {
    ...variant,
    price: variant.price.toString(),
    compareAtPrice: variant.compareAtPrice?.toString() ?? null,
  };
}

export async function createProductVariant(
  input: CreateProductVariantInput,
  actor: AuditActor,
) {
  const variant = await prisma.productVariant.create({
    data: {
      productId: input.productId,
      sku: input.sku,
      attributes: input.attributes,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      weightGrams: input.weightGrams ?? null,
      status: input.status ?? "ACTIVE",
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "productVariant.create",
    entityType: "ProductVariant",
    entityId: variant.id,
    afterState: serializeVariant(variant),
  });

  return variant;
}

export async function updateProductVariant(
  id: string,
  input: UpdateProductVariantInput,
  actor: AuditActor,
) {
  const before = await prisma.productVariant.findUniqueOrThrow({
    where: { id },
  });

  const variant = await prisma.productVariant.update({
    where: { id },
    data: {
      sku: input.sku,
      attributes: input.attributes,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      weightGrams: input.weightGrams,
      status: input.status,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "productVariant.update",
    entityType: "ProductVariant",
    entityId: variant.id,
    beforeState: serializeVariant(before),
    afterState: serializeVariant(variant),
  });

  return variant;
}
