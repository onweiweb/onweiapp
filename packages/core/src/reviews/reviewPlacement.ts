import { prisma } from "@onwei/database";
import type { ReviewSurface } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { CreateReviewPlacementInput } from "./types";

/**
 * Features an approved review onto a surface. Postgres treats NULL as
 * distinct in a unique constraint, so the schema's
 * @@unique([surface, productId, reviewId]) alone won't stop duplicate
 * HOME_HERO/HOME_WALL rows (productId: null) for the same review — check
 * for an existing row first rather than relying on the DB constraint.
 */
export async function setReviewPlacement(
  input: CreateReviewPlacementInput,
  actor: AuditActor,
) {
  const productId = input.productId ?? null;

  const existing = await prisma.reviewPlacement.findFirst({
    where: { surface: input.surface, productId, reviewId: input.reviewId },
  });
  if (existing) {
    throw new Error("already-featured: this review is already on this surface");
  }

  const placement = await prisma.reviewPlacement.create({
    data: {
      surface: input.surface,
      productId,
      reviewId: input.reviewId,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "reviewPlacement.set",
    entityType: "ReviewPlacement",
    entityId: placement.id,
    afterState: placement,
  });

  return placement;
}

export async function removeReviewPlacement(id: string, actor: AuditActor) {
  const before = await prisma.reviewPlacement.findUniqueOrThrow({
    where: { id },
  });
  await prisma.reviewPlacement.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "reviewPlacement.remove",
    entityType: "ReviewPlacement",
    entityId: id,
    beforeState: before,
  });
}

/** Rewrites sortOrder for every placement on a surface (+ product, for
 * PRODUCT_WALL) to match the given id order — same technique as
 * reorderProductImages, no drag-and-drop library needed. */
export async function reorderReviewPlacements(
  surface: ReviewSurface,
  productId: string | null,
  orderedPlacementIds: string[],
  actor: AuditActor,
) {
  const before = await prisma.reviewPlacement.findMany({
    where: { surface, productId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.$transaction(
    orderedPlacementIds.map((id, index) =>
      prisma.reviewPlacement.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "reviewPlacement.reorder",
    entityType: "ReviewPlacement",
    entityId: `${surface}:${productId ?? "brand"}`,
    beforeState: { order: before.map((p) => p.id) },
    afterState: { order: orderedPlacementIds },
  });
}

export async function updateReviewSurfaceLimit(
  surface: ReviewSurface,
  limit: number,
  actor: AuditActor,
  productId: string | null = null,
) {
  // Prisma's compound-unique `where` shorthand can't take a literal null for
  // a nullable field (surface_productId requires productId: string), so the
  // global (productId: null) row has to be found via a plain filter and
  // updated by id — no upsert-by-compound-key for that case.
  const before = productId
    ? await prisma.reviewSurfaceConfig.findUnique({
        where: { surface_productId: { surface, productId } },
      })
    : await prisma.reviewSurfaceConfig.findFirst({
        where: { surface, productId: null },
      });

  const config = before
    ? await prisma.reviewSurfaceConfig.update({
        where: { id: before.id },
        data: { limit },
      })
    : await prisma.reviewSurfaceConfig.create({
        data: { surface, productId, limit },
      });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "reviewSurfaceConfig.update",
    entityType: "ReviewSurfaceConfig",
    entityId: config.id,
    beforeState: before,
    afterState: config,
  });

  return config;
}
