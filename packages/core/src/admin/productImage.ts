import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type { AuditActor } from "./types";

/**
 * Records an already-uploaded image (the Blob upload itself happens in the
 * API route, which has access to the request body — this just persists the
 * resulting URL). isPlaceholder is always false here: an admin-uploaded
 * photo is by definition not the storefront's placeholder fallback.
 */
export async function addProductImage(
  input: {
    productId: string;
    url: string;
    altText?: string | null;
    sortOrder?: number;
  },
  actor: AuditActor,
) {
  const image = await prisma.productImage.create({
    data: {
      productId: input.productId,
      url: input.url,
      altText: input.altText ?? null,
      sortOrder: input.sortOrder ?? 0,
      isPlaceholder: false,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "productImage.add",
    entityType: "ProductImage",
    entityId: image.id,
    afterState: image,
  });

  return image;
}

export async function removeProductImage(id: string, actor: AuditActor) {
  const before = await prisma.productImage.findUniqueOrThrow({
    where: { id },
  });

  await prisma.productImage.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "productImage.remove",
    entityType: "ProductImage",
    entityId: id,
    beforeState: before,
  });
}

export async function reorderProductImages(
  productId: string,
  orderedImageIds: string[],
  actor: AuditActor,
) {
  await prisma.$transaction(
    orderedImageIds.map((id, index) =>
      prisma.productImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "productImage.reorder",
    entityType: "Product",
    entityId: productId,
    afterState: { orderedImageIds },
  });
}
