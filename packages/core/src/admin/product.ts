import { prisma, Prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import { validateProductSpecs } from "./productSpecs";
import { upsertRedirect } from "./redirect";
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
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
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
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
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

  if (before.slug !== product.slug) {
    await upsertRedirect(`/product/${before.slug}`, `/product/${product.slug}`);
  }

  return product;
}

/** Soft delete only, see docs/DATABASE_SCHEMA.md, Product is never hard-deleted. */
export async function deleteProduct(id: string, actor: AuditActor) {
  const before = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { category: true },
  });

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

  // No single new URL to send a delisted product to, its own category
  // collection page is more useful than a bare 404 for any residual
  // backlinks/search-index entries.
  await upsertRedirect(
    `/product/${before.slug}`,
    `/collection/${before.category.slug}`,
  );

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

  // Harmless if left in place (the redirect only ever fires on the
  // not-found path, and a restored product IS found again), but tidying it
  // up means a slug reused later can't collide with a stale row.
  await prisma.redirect
    .delete({ where: { fromPath: `/product/${product.slug}` } })
    .catch(() => {});

  return product;
}
