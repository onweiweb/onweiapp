import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";

/**
 * "Events and Insider offers" on the storefront /insiders page (client
 * feedback 2026-11-16), managed in admin Insiders > Page updates.
 */
export interface InsiderUpdateItem {
  id: string;
  title: string;
  body: string;
  eventDate: Date | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface InsiderUpdateInput {
  title: string;
  body: string;
  /** "YYYY-MM-DD" or empty. */
  eventDate?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  isActive: boolean;
  sortOrder?: number;
}

export type InsiderUpdateError =
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "BODY_REQUIRED"
  | "BODY_TOO_LONG"
  | "INVALID_DATE"
  | "INVALID_LINK"
  | "NOT_FOUND";

const SELECT = {
  id: true,
  title: true,
  body: true,
  eventDate: true,
  imageUrl: true,
  linkUrl: true,
  linkLabel: true,
  isActive: true,
  sortOrder: true,
} as const;

/** Links must be https, or a path on our own site ("/collection/all"). */
export function isAllowedUpdateLink(link: string): boolean {
  if (link.startsWith("/") && !link.startsWith("//")) return true;
  try {
    return new URL(link).protocol === "https:";
  } catch {
    return false;
  }
}

/** "2026-12-05" as midday UTC, so it reads as the same day everywhere. */
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export function checkInsiderUpdate(
  input: InsiderUpdateInput,
): InsiderUpdateError | null {
  const title = input.title.trim();
  if (!title) return "TITLE_REQUIRED";
  if (title.length > 120) return "TITLE_TOO_LONG";
  const body = input.body.trim();
  if (!body) return "BODY_REQUIRED";
  if (body.length > 1000) return "BODY_TOO_LONG";
  if (input.eventDate && !parseDay(input.eventDate)) return "INVALID_DATE";
  if (input.linkUrl?.trim() && !isAllowedUpdateLink(input.linkUrl.trim())) {
    return "INVALID_LINK";
  }
  return null;
}

function toData(input: InsiderUpdateInput) {
  return {
    title: input.title.trim(),
    body: input.body.trim(),
    eventDate: input.eventDate ? parseDay(input.eventDate) : null,
    imageUrl: input.imageUrl?.trim() || null,
    linkUrl: input.linkUrl?.trim() || null,
    linkLabel: input.linkUrl?.trim() ? input.linkLabel?.trim() || null : null,
    isActive: input.isActive,
    sortOrder: input.sortOrder ?? 0,
  };
}

/** Storefront: switched-on updates, in staff order. */
export async function listActiveInsiderUpdates(): Promise<InsiderUpdateItem[]> {
  return prisma.insiderUpdate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: SELECT,
    take: 12,
  });
}

/** Admin: every update. */
export async function listInsiderUpdates(): Promise<InsiderUpdateItem[]> {
  return prisma.insiderUpdate.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: SELECT,
    take: 100,
  });
}

export async function saveInsiderUpdate(
  id: string | null,
  input: InsiderUpdateInput,
  actor: AuditActor,
): Promise<
  | { ok: true; update: InsiderUpdateItem }
  | { ok: false; reason: InsiderUpdateError }
> {
  const problem = checkInsiderUpdate(input);
  if (problem) return { ok: false, reason: problem };
  const data = { ...toData(input), updatedById: actor.staffUserId };
  if (id) {
    const before = await prisma.insiderUpdate.findUnique({ where: { id } });
    if (!before) return { ok: false, reason: "NOT_FOUND" };
    const update = await prisma.insiderUpdate.update({
      where: { id },
      data,
      select: SELECT,
    });
    await writeAuditLog({
      staffUserId: actor.staffUserId,
      action: "insider_update.save",
      entityType: "InsiderUpdate",
      entityId: id,
      beforeState: before,
      afterState: update,
    });
    return { ok: true, update };
  }
  const update = await prisma.insiderUpdate.create({ data, select: SELECT });
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "insider_update.create",
    entityType: "InsiderUpdate",
    entityId: update.id,
    afterState: update,
  });
  return { ok: true, update };
}

export async function deleteInsiderUpdate(
  id: string,
  actor: AuditActor,
): Promise<boolean> {
  const before = await prisma.insiderUpdate.findUnique({ where: { id } });
  if (!before) return false;
  await prisma.insiderUpdate.delete({ where: { id } });
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "insider_update.delete",
    entityType: "InsiderUpdate",
    entityId: id,
    beforeState: before,
  });
  return true;
}
