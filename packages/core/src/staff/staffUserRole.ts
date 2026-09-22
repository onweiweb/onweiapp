import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";

export async function assignStaffRole(
  staffUserId: string,
  roleId: string,
  actor: AuditActor,
) {
  const assignment = await prisma.staffUserRole.upsert({
    where: { staffUserId_roleId: { staffUserId, roleId } },
    update: {},
    create: { staffUserId, roleId },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "staffUserRole.assign",
    entityType: "StaffUser",
    entityId: staffUserId,
    afterState: { roleId },
  });

  return assignment;
}

export async function unassignStaffRole(
  staffUserId: string,
  roleId: string,
  actor: AuditActor,
) {
  if (staffUserId === actor.staffUserId) {
    const roleCount = await prisma.staffUserRole.count({
      where: { staffUserId },
    });
    if (roleCount <= 1) {
      throw new Error(
        "self-unassign: You can't remove your own last role — ask another admin to do it.",
      );
    }
  }

  await prisma.staffUserRole.delete({
    where: { staffUserId_roleId: { staffUserId, roleId } },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "staffUserRole.unassign",
    entityType: "StaffUser",
    entityId: staffUserId,
    beforeState: { roleId },
  });
}
