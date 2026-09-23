import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type {
  AuditActor,
  CreateMarqueeItemInput,
  UpdateMarqueeItemInput,
} from "./types";

export async function createMarqueeItem(
  input: CreateMarqueeItemInput,
  actor: AuditActor,
) {
  const item = await prisma.marqueeItem.create({
    data: {
      placement: input.placement,
      label: input.label,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "marqueeItem.create",
    entityType: "MarqueeItem",
    entityId: item.id,
    afterState: item,
  });

  return item;
}

export async function updateMarqueeItem(
  id: string,
  input: UpdateMarqueeItemInput,
  actor: AuditActor,
) {
  const before = await prisma.marqueeItem.findUniqueOrThrow({ where: { id } });

  const item = await prisma.marqueeItem.update({
    where: { id },
    data: {
      placement: input.placement,
      label: input.label,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "marqueeItem.update",
    entityType: "MarqueeItem",
    entityId: item.id,
    beforeState: before,
    afterState: item,
  });

  return item;
}

/** Real delete, not soft — marketing content, not customer/order/audit data. */
export async function deleteMarqueeItem(id: string, actor: AuditActor) {
  const before = await prisma.marqueeItem.findUniqueOrThrow({ where: { id } });
  await prisma.marqueeItem.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "marqueeItem.delete",
    entityType: "MarqueeItem",
    entityId: id,
    beforeState: before,
  });
}
