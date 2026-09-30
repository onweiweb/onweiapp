import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import { upsertRedirect } from "./redirect";
import type {
  AuditActor,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./types";

export async function createCategory(
  input: CreateCategoryInput,
  actor: AuditActor,
) {
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId ?? null,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "category.create",
    entityType: "Category",
    entityId: category.id,
    afterState: category,
  });

  return category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
  actor: AuditActor,
) {
  const before = await prisma.category.findUniqueOrThrow({ where: { id } });

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "category.update",
    entityType: "Category",
    entityId: category.id,
    beforeState: before,
    afterState: category,
  });

  if (before.slug !== category.slug) {
    await upsertRedirect(
      `/collection/${before.slug}`,
      `/collection/${category.slug}`,
    );
  }

  return category;
}
