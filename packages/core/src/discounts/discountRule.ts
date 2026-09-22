import { prisma, Prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { validateDiscountRuleConfig } from "./discountRuleConfig";
import type { CreateDiscountRuleInput, UpdateDiscountRuleInput } from "./types";

export async function addDiscountRule(
  couponId: string,
  input: CreateDiscountRuleInput,
  actor: AuditActor,
) {
  const validated = validateDiscountRuleConfig(input.type, input.config);
  if (!validated.ok) {
    throw new Error(`invalid-config: ${validated.error}`);
  }

  const rule = await prisma.discountRule.create({
    data: {
      couponId,
      type: input.type,
      config: validated.data as Prisma.InputJsonValue,
      priority: input.priority ?? 0,
      stackable: input.stackable ?? false,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "discountRule.create",
    entityType: "DiscountRule",
    entityId: rule.id,
    afterState: rule,
  });

  return rule;
}

export async function updateDiscountRule(
  id: string,
  input: UpdateDiscountRuleInput,
  actor: AuditActor,
) {
  const before = await prisma.discountRule.findUniqueOrThrow({
    where: { id },
  });

  const type = input.type ?? before.type;
  let config = before.config as Record<string, unknown>;
  if (input.config !== undefined) {
    const validated = validateDiscountRuleConfig(type, input.config);
    if (!validated.ok) {
      throw new Error(`invalid-config: ${validated.error}`);
    }
    config = validated.data;
  } else if (input.type !== undefined) {
    // Type changed but config didn't — re-validate the existing config
    // against the new type's schema rather than leaving a mismatched shape.
    const validated = validateDiscountRuleConfig(type, before.config);
    if (!validated.ok) {
      throw new Error(`invalid-config: ${validated.error}`);
    }
    config = validated.data;
  }

  const rule = await prisma.discountRule.update({
    where: { id },
    data: {
      type,
      config: config as Prisma.InputJsonValue,
      priority: input.priority,
      stackable: input.stackable,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "discountRule.update",
    entityType: "DiscountRule",
    entityId: rule.id,
    beforeState: before,
    afterState: rule,
  });

  return rule;
}
