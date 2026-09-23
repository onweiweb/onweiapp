import { prisma, Prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import { validateProductSpecs } from "./productSpecs";
import type {
  AuditActor,
  CreateProductInput,
  UpdateProductInput,
} from "./types";

function resolveSpecs(specs: CreateProductInput["specs"]) {
  if (specs === undefined) return undefined;
  if (specs === null) return Prisma.JsonNull;
  const validated = validateProductSpecs(specs);
  if (!validated.ok) {
    throw new Error(`invalid-specs: ${validated.error}`);
  }
  return validated.data as Prisma.InputJsonValue;
}

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
      specs: resolveSpecs(input.specs) ?? Prisma.JsonNull,
      whoThisIsFor: input.whoThisIsFor ?? null,
      careInstructions: input.careInstructions ?? null,
      powerRating: input.powerRating ?? null,
      spinRating: input.spinRating ?? null,
      controlRating: input.controlRating ?? null,
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
      specs: resolveSpecs(input.specs),
      whoThisIsFor: input.whoThisIsFor,
      careInstructions: input.careInstructions,
      powerRating: input.powerRating,
      spinRating: input.spinRating,
      controlRating: input.controlRating,
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
