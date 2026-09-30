import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { canTransition } from "./orderStateMachine";
import type { UpdateOrderStatusInput } from "./types";

/**
 * Moves an Order to a new status, but only along a legal transition
 * (orderStateMachine.ts), rejects everything else rather than allowing an
 * arbitrary status write. Writes the OrderStatusHistory row that drives
 * tracking, and the AuditLog entry every admin write needs
 * (docs/DATABASE_SCHEMA.md).
 *
 * The status write is conditional on the status we validated against
 * (`updateMany` with the old status in the where clause), and runs in one
 * transaction with the history and audit rows. Two staff members (or a later
 * courier webhook) racing on the same order can't both apply a transition,
 * and a failed log write can't leave the change unlogged.
 */
export async function updateOrderStatus(
  input: UpdateOrderStatusInput,
  actor: AuditActor,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.order.findUniqueOrThrow({
      where: { id: input.orderId },
    });

    if (!canTransition(before.status, input.toStatus)) {
      throw new Error(
        `invalid-transition: can't move an order from ${before.status} to ${input.toStatus}`,
      );
    }

    const updated = await tx.order.updateMany({
      where: { id: input.orderId, status: before.status },
      data: { status: input.toStatus },
    });
    if (updated.count === 0) {
      throw new Error(
        "invalid-transition: this order was changed by someone else, reload and try again",
      );
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: input.orderId,
        status: input.toStatus,
        note: input.note ?? null,
        changedBy: actor.staffUserId,
      },
    });

    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "order.updateStatus",
        entityType: "Order",
        entityId: input.orderId,
        beforeState: { status: before.status },
        afterState: { status: input.toStatus, note: input.note ?? null },
      },
      tx,
    );

    return tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
  });
}
