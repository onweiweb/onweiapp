import { prisma } from "@onwei/database";
import type { AuditActor } from "../admin/types";
import { approveReturnRequest, ReturnActionError } from "../commerce/returns";
import type { ResolveReturnInput } from "./types";

/**
 * Approves a ReturnRequest. Since the commerce build (2026-11-09) approving
 * no longer restocks: stock goes back when staff mark the item received in
 * good condition (markReturnReceived), so an approved return that never
 * arrives can't inflate stock.
 */
export async function approveReturn(
  input: ResolveReturnInput,
  actor: AuditActor,
) {
  try {
    await approveReturnRequest(input.returnRequestId, actor);
  } catch (error) {
    if (error instanceof ReturnActionError) {
      const current = await prisma.returnRequest.findUnique({
        where: { id: input.returnRequestId },
      });
      throw new Error(
        `not-pending: return request is already ${current?.status ?? "gone"}`,
      );
    }
    throw error;
  }
  return prisma.returnRequest.findUniqueOrThrow({
    where: { id: input.returnRequestId },
  });
}
