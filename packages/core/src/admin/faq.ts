import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type { AuditActor, CreateFaqInput, UpdateFaqInput } from "./types";

export async function createFaq(input: CreateFaqInput, actor: AuditActor) {
  const faq = await prisma.faq.create({
    data: {
      productId: input.productId ?? null,
      question: input.question,
      answer: input.answer,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "faq.create",
    entityType: "Faq",
    entityId: faq.id,
    afterState: faq,
  });

  return faq;
}

export async function updateFaq(
  id: string,
  input: UpdateFaqInput,
  actor: AuditActor,
) {
  const before = await prisma.faq.findUniqueOrThrow({ where: { id } });

  const faq = await prisma.faq.update({
    where: { id },
    data: {
      productId: input.productId,
      question: input.question,
      answer: input.answer,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "faq.update",
    entityType: "Faq",
    entityId: faq.id,
    beforeState: before,
    afterState: faq,
  });

  return faq;
}

/** Real delete, not soft — FAQs aren't customer-facing order/audit data. */
export async function deleteFaq(id: string, actor: AuditActor) {
  const before = await prisma.faq.findUniqueOrThrow({ where: { id } });
  await prisma.faq.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "faq.delete",
    entityType: "Faq",
    entityId: id,
    beforeState: before,
  });
}
