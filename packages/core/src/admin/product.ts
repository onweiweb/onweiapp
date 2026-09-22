import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type {
  AuditActor,
  CreateProductInput,
  UpdateProductInput,
} from "./types";

export async function createProduct(
  input: CreateProductInput,
  actor: AuditActor,
) {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      categoryId: input.categoryId,
      description: input.description ?? null,
      status: input.status ?? "DRAFT",
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    afterState: product,
  });

  return product;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  actor: AuditActor,
) {
  const before = await prisma.product.findUniqueOrThrow({ where: { id } });

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug,
      categoryId: input.categoryId,
      description: input.description,
      status: input.status,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "product.update",
    entityType: "Product",
    entityId: product.id,
    beforeState: before,
    afterState: product,
  });

  return product;
}

/** Soft delete only — see docs/DATABASE_SCHEMA.md, Product is never hard-deleted. */
export async function deleteProduct(id: string, actor: AuditActor) {
  const before = await prisma.product.findUniqueOrThrow({ where: { id } });

  const product = await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "product.delete",
    entityType: "Product",
    entityId: product.id,
    beforeState: before,
    afterState: product,
  });

  return product;
}

export async function restoreProduct(id: string, actor: AuditActor) {
  const before = await prisma.product.findUniqueOrThrow({ where: { id } });

  const product = await prisma.product.update({
    where: { id },
    data: { deletedAt: null },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "product.restore",
    entityType: "Product",
    entityId: product.id,
    beforeState: before,
    afterState: product,
  });

  return product;
}
