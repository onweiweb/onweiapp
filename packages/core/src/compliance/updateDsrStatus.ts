import { prisma } from "@onwei/database";
import type { DsrStatus } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";

// Not a full state machine like Order's, but the same idea at a smaller
// scale: RECEIVED and IN_PROGRESS are the only non-terminal states, and a
// request never moves out of FULFILLED/REJECTED once resolved.
const ALLOWED_TRANSITIONS: Record<DsrStatus, readonly DsrStatus[]> = {
  RECEIVED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["FULFILLED", "REJECTED"],
  FULFILLED: [],
  REJECTED: [],
};

/**
 * Moves a DataSubjectRequest to a new status. DSR handling is
 * access/DPDP-relevant per docs/SECURITY_AND_DPDP.md, so every transition is
 * audit-logged like an order status change.
 */
export async function updateDsrStatus(
  id: string,
  toStatus: DsrStatus,
  actor: AuditActor,
) {
  const before = await prisma.dataSubjectRequest.findUniqueOrThrow({
    where: { id },
  });

  if (!ALLOWED_TRANSITIONS[before.status].includes(toStatus)) {
    throw new Error(
      `invalid-transition: can't move a data request from ${before.status} to ${toStatus}`,
    );
  }

  const request = await prisma.dataSubjectRequest.update({
    where: { id },
    data: {
      status: toStatus,
      fulfilledAt: toStatus === "FULFILLED" ? new Date() : undefined,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "dsr.updateStatus",
    entityType: "DataSubjectRequest",
    entityId: id,
    beforeState: { status: before.status },
    afterState: { status: request.status },
  });

  return request;
}
