import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { canTransition } from "./orderStateMachine";
import type { UpdateOrderStatusInput } from "./types";

/**
 * Moves an Order to a new status, but only along a legal transition
 * (orderStateMachine.ts) — rejects everything else rather than allowing an
 * arbitrary status write. Writes the OrderStatusHistory row that drives
 * tracking, and the AuditLog entry every admin write needs
 * (docs/DATABASE_SCHEMA.md).
 */
export async function updateOrderStatus(
  input: UpdateOrderStatusInput,
  actor: AuditActor,
) {
  const before = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
  });

  if (!canTransition(before.status, input.toStatus)) {
    throw new Error(
      `invalid-transition: can't move an order from ${before.status} to ${input.toStatus}`,
    );
  }

  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id: input.orderId },
      data: { status: input.toStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: input.orderId,
        status: input.toStatus,
        note: input.note ?? null,
        changedBy: actor.staffUserId,
      },
    }),
  ]);

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "order.updateStatus",
    entityType: "Order",
    entityId: input.orderId,
    beforeState: { status: before.status },
    afterState: { status: order.status, note: input.note ?? null },
  });

  return order;
}
