import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { CreateManualReviewInput } from "./types";

export async function approveReview(id: string, actor: AuditActor) {
  const before = await prisma.review.findUniqueOrThrow({ where: { id } });
  if (before.isApproved) {
    throw new Error("already-approved: this review is already live");
  }

  const review = await prisma.review.update({
    where: { id },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: actor.staffUserId,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "review.approve",
    entityType: "Review",
    entityId: review.id,
    beforeState: { isApproved: before.isApproved },
    afterState: {
      isApproved: review.isApproved,
      approvedAt: review.approvedAt,
    },
  });

  return review;
}

/** Un-publishes a review that was previously approved. */
export async function rejectReview(id: string, actor: AuditActor) {
  const before = await prisma.review.findUniqueOrThrow({ where: { id } });

  const review = await prisma.review.update({
    where: { id },
    data: { isApproved: false, approvedAt: null, approvedBy: null },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "review.reject",
    entityType: "Review",
    entityId: review.id,
    beforeState: { isApproved: before.isApproved },
    afterState: { isApproved: review.isApproved },
  });

  return review;
}

/**
 * Staff-transcribed review from a source outside the site (e.g. email).
 * Lands unapproved by default, same as any other review — staff approves it
 * as a separate, explicit step rather than auto-publishing.
 */
export async function createManualReview(
  input: CreateManualReviewInput,
  actor: AuditActor,
) {
  const review = await prisma.review.create({
    data: {
      targetType: input.targetType,
      productId: input.productId ?? null,
      source: "EMAIL",
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
      authorDisplay: input.authorDisplay ?? null,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "review.createManual",
    entityType: "Review",
    entityId: review.id,
    afterState: review,
  });

  return review;
}
