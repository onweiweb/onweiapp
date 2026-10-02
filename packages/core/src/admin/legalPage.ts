import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type { AuditActor } from "./types";

export interface LegalSectionInput {
  heading: string;
  body: string;
  isActive?: boolean;
}

/** Edits a page's title and intro paragraph. */
export async function updateLegalPage(
  id: string,
  input: { title?: string; intro?: string | null },
  actor: AuditActor,
) {
  const before = await prisma.legalPage.findUniqueOrThrow({ where: { id } });
  const page = await prisma.legalPage.update({
    where: { id },
    data: {
      title: input.title,
      intro: input.intro,
      updatedByStaffId: actor.staffUserId,
    },
  });
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "legalPage.update",
    entityType: "LegalPage",
    entityId: id,
    beforeState: before,
    afterState: page,
  });
  return page;
}

export async function createLegalSection(
  pageId: string,
  input: LegalSectionInput,
  actor: AuditActor,
) {
  return prisma.$transaction(async (tx) => {
    await tx.legalPage.findUniqueOrThrow({ where: { id: pageId } });
    const last = await tx.legalSection.aggregate({
      where: { pageId },
      _max: { sortOrder: true },
    });
    const section = await tx.legalSection.create({
      data: {
        pageId,
        heading: input.heading,
        body: input.body,
        isActive: input.isActive ?? true,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await tx.legalPage.update({
      where: { id: pageId },
      data: { updatedByStaffId: actor.staffUserId },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "legalSection.create",
        entityType: "LegalSection",
        entityId: section.id,
        afterState: section,
      },
      tx,
    );
    return section;
  });
}

export async function updateLegalSection(
  id: string,
  input: Partial<LegalSectionInput>,
  actor: AuditActor,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.legalSection.findUniqueOrThrow({ where: { id } });
    const section = await tx.legalSection.update({
      where: { id },
      data: {
        heading: input.heading,
        body: input.body,
        isActive: input.isActive,
      },
    });
    await tx.legalPage.update({
      where: { id: section.pageId },
      data: { updatedByStaffId: actor.staffUserId },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "legalSection.update",
        entityType: "LegalSection",
        entityId: id,
        beforeState: before,
        afterState: section,
      },
      tx,
    );
    return section;
  });
}

/** Moves a section one step up or down within its page by swapping its
 * position with the neighbour. Does nothing at the top or bottom. */
export async function moveLegalSection(
  id: string,
  direction: "up" | "down",
  actor: AuditActor,
) {
  return prisma.$transaction(async (tx) => {
    const section = await tx.legalSection.findUniqueOrThrow({ where: { id } });
    const siblings = await tx.legalSection.findMany({
      where: { pageId: section.pageId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const index = siblings.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return;

    const order = siblings.map((row) => row.id);
    [order[index], order[target]] = [order[target]!, order[index]!];
    // Rewrite the whole sequence so duplicate sortOrders can't linger.
    for (const [position, sectionId] of order.entries()) {
      await tx.legalSection.update({
        where: { id: sectionId },
        data: { sortOrder: position },
      });
    }
    await tx.legalPage.update({
      where: { id: section.pageId },
      data: { updatedByStaffId: actor.staffUserId },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "legalSection.move",
        entityType: "LegalSection",
        entityId: id,
        beforeState: { sortOrder: section.sortOrder },
        afterState: { direction, position: target },
      },
      tx,
    );
  });
}

/** Real delete, not soft: editorial content, same convention as Article/
 * Faq. Staff who only want a point off the page can hide it instead. */
export async function deleteLegalSection(id: string, actor: AuditActor) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.legalSection.findUniqueOrThrow({ where: { id } });
    await tx.legalSection.delete({ where: { id } });
    await tx.legalPage.update({
      where: { id: before.pageId },
      data: { updatedByStaffId: actor.staffUserId },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "legalSection.delete",
        entityType: "LegalSection",
        entityId: id,
        beforeState: before,
      },
      tx,
    );
  });
}
