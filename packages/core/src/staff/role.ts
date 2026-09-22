import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { CreateRoleInput } from "./types";

export async function createRole(input: CreateRoleInput, actor: AuditActor) {
  const role = await prisma.role.create({
    data: { name: input.name, description: input.description ?? null },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "role.create",
    entityType: "Role",
    entityId: role.id,
    afterState: role,
  });

  return role;
}

/**
 * Sets a role's permission set to exactly `permissionKeys` — diffs against
 * what's currently assigned and only writes the delta, but the effective
 * result is a full replace, not a merge.
 */
export async function updateRolePermissions(
  roleId: string,
  permissionKeys: string[],
  actor: AuditActor,
) {
  const [role, permissions, current] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { id: roleId } }),
    prisma.permission.findMany({ where: { key: { in: permissionKeys } } }),
    prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    }),
  ]);

  const beforeKeys = current.map((rp) => rp.permission.key);
  const desiredIds = new Set(permissions.map((p) => p.id));
  const currentIds = new Set(current.map((rp) => rp.permissionId));

  const toAdd = permissions.filter((p) => !currentIds.has(p.id));
  const toRemove = current.filter((rp) => !desiredIds.has(rp.permissionId));

  await prisma.$transaction([
    ...toRemove.map((rp) =>
      prisma.rolePermission.delete({
        where: {
          roleId_permissionId: { roleId, permissionId: rp.permissionId },
        },
      }),
    ),
    ...toAdd.map((permission) =>
      prisma.rolePermission.create({
        data: { roleId, permissionId: permission.id },
      }),
    ),
  ]);

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "role.updatePermissions",
    entityType: "Role",
    entityId: roleId,
    beforeState: { permissions: beforeKeys },
    afterState: { permissions: permissions.map((p) => p.key) },
  });

  return role;
}
