import { prisma } from "@onwei/database";
import type { AuditActor } from "../admin/types";
import { rejectReturnRequest, ReturnActionError } from "../commerce/returns";
import type { ResolveReturnInput } from "./types";

/** Rejects a ReturnRequest. No inventory change, nothing was restocked. */
export async function rejectReturn(
  input: ResolveReturnInput,
  actor: AuditActor,
) {
  try {
    await rejectReturnRequest(
      input.returnRequestId,
      input.note?.trim() || "This item doesn't meet our return conditions.",
      actor,
    );
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
