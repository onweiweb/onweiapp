import { hashPassword } from "@onwei/auth";
import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { CreateStaffUserInput, UpdateStaffUserInput } from "./types";

export async function createStaffUser(
  input: CreateStaffUserInput,
  actor: AuditActor,
) {
  const passwordHash = await hashPassword(input.initialPassword);

  const staffUser = await prisma.staffUser.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
  });

  // Never log the password hash — redact it from the audit trail even
  // though it isn't the plaintext.
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "staffUser.create",
    entityType: "StaffUser",
    entityId: staffUser.id,
    afterState: { email: staffUser.email, name: staffUser.name },
  });

  return staffUser;
}

export async function updateStaffUser(
  id: string,
  input: UpdateStaffUserInput,
  actor: AuditActor,
) {
  if (id === actor.staffUserId && input.isActive === false) {
    throw new Error(
      "self-deactivate: You can't deactivate your own account — ask another admin to do it.",
    );
  }

  const before = await prisma.staffUser.findUniqueOrThrow({ where: { id } });

  const passwordHash = input.resetPassword
    ? await hashPassword(input.resetPassword)
    : undefined;

  const staffUser = await prisma.staffUser.update({
    where: { id },
    data: {
      name: input.name,
      isActive: input.isActive,
      passwordHash,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "staffUser.update",
    entityType: "StaffUser",
    entityId: staffUser.id,
    beforeState: { name: before.name, isActive: before.isActive },
    afterState: {
      name: staffUser.name,
      isActive: staffUser.isActive,
      passwordReset: Boolean(input.resetPassword),
    },
  });

  return staffUser;
}
