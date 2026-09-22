import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { CreateCouponInput, UpdateCouponInput } from "./types";

export async function createCoupon(
  input: CreateCouponInput,
  actor: AuditActor,
) {
  const coupon = await prisma.coupon.create({
    data: {
      code: input.code,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? null,
      minOrderValue: input.minOrderValue ?? null,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "coupon.create",
    entityType: "Coupon",
    entityId: coupon.id,
    afterState: coupon,
  });

  return coupon;
}

export async function updateCoupon(
  id: string,
  input: UpdateCouponInput,
  actor: AuditActor,
) {
  const before = await prisma.coupon.findUniqueOrThrow({ where: { id } });

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      code: input.code,
      description: input.description,
      isActive: input.isActive,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit,
      perCustomerLimit: input.perCustomerLimit,
      minOrderValue: input.minOrderValue,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "coupon.update",
    entityType: "Coupon",
    entityId: coupon.id,
    beforeState: before,
    afterState: coupon,
  });

  return coupon;
}
