import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { ResolveReturnInput } from "./types";

/** Rejects a ReturnRequest. No inventory change — nothing was restocked. */
export async function rejectReturn(
  input: ResolveReturnInput,
  actor: AuditActor,
) {
  const before = await prisma.returnRequest.findUniqueOrThrow({
    where: { id: input.returnRequestId },
  });

  if (before.status !== "REQUESTED") {
    throw new Error(`not-pending: return request is already ${before.status}`);
  }

  const returnRequest = await prisma.returnRequest.update({
    where: { id: input.returnRequestId },
    data: { status: "REJECTED", resolvedAt: new Date() },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "return.reject",
    entityType: "ReturnRequest",
    entityId: input.returnRequestId,
    beforeState: { status: before.status },
    afterState: { status: returnRequest.status, note: input.note ?? null },
  });

  return returnRequest;
}
