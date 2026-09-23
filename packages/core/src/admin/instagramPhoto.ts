import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type {
  AuditActor,
  CreateInstagramPhotoInput,
  UpdateInstagramPhotoInput,
} from "./types";

export async function createInstagramPhoto(
  input: CreateInstagramPhotoInput,
  actor: AuditActor,
) {
  const photo = await prisma.instagramPhoto.create({
    data: {
      imageUrl: input.imageUrl,
      altText: input.altText ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "instagramPhoto.create",
    entityType: "InstagramPhoto",
    entityId: photo.id,
    afterState: photo,
  });

  return photo;
}

export async function updateInstagramPhoto(
  id: string,
  input: UpdateInstagramPhotoInput,
  actor: AuditActor,
) {
  const before = await prisma.instagramPhoto.findUniqueOrThrow({
    where: { id },
  });

  const photo = await prisma.instagramPhoto.update({
    where: { id },
    data: {
      imageUrl: input.imageUrl,
      altText: input.altText,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "instagramPhoto.update",
    entityType: "InstagramPhoto",
    entityId: photo.id,
    beforeState: before,
    afterState: photo,
  });

  return photo;
}

/** Real delete, not soft — marketing content, not customer/order/audit data. */
export async function deleteInstagramPhoto(id: string, actor: AuditActor) {
  const before = await prisma.instagramPhoto.findUniqueOrThrow({
    where: { id },
  });
  await prisma.instagramPhoto.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "instagramPhoto.delete",
    entityType: "InstagramPhoto",
    entityId: id,
    beforeState: before,
  });
}
