import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type {
  AuditActor,
  CreateValuePropInput,
  UpdateValuePropInput,
} from "./types";

export async function createValueProp(
  input: CreateValuePropInput,
  actor: AuditActor,
) {
  const prop = await prisma.valueProp.create({
    data: {
      illustrationUrl: input.illustrationUrl,
      width: input.width,
      height: input.height,
      title: input.title,
      body: input.body,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "valueProp.create",
    entityType: "ValueProp",
    entityId: prop.id,
    afterState: prop,
  });

  return prop;
}

export async function updateValueProp(
  id: string,
  input: UpdateValuePropInput,
  actor: AuditActor,
) {
  const before = await prisma.valueProp.findUniqueOrThrow({ where: { id } });

  const prop = await prisma.valueProp.update({
    where: { id },
    data: {
      illustrationUrl: input.illustrationUrl,
      width: input.width,
      height: input.height,
      title: input.title,
      body: input.body,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "valueProp.update",
    entityType: "ValueProp",
    entityId: prop.id,
    beforeState: before,
    afterState: prop,
  });

  return prop;
}

/** Real delete, not soft — marketing content, not customer/order/audit data. */
export async function deleteValueProp(id: string, actor: AuditActor) {
  const before = await prisma.valueProp.findUniqueOrThrow({ where: { id } });
  await prisma.valueProp.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "valueProp.delete",
    entityType: "ValueProp",
    entityId: id,
    beforeState: before,
  });
}
