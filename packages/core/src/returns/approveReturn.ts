import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { ResolveReturnInput } from "./types";

/**
 * Approves a ReturnRequest and restocks the returned quantity. Restocks into
 * the first Inventory row found for that variant — only one warehouse
 * ("Onwei Main Warehouse") exists today, so there's no routing decision to
 * make yet; this is a documented assumption, not a solved multi-warehouse
 * flow. Per docs/TEST_PLAN.md: "approved return increments stock and logs
 * reason RETURN."
 */
export async function approveReturn(
  input: ResolveReturnInput,
  actor: AuditActor,
) {
  const before = await prisma.returnRequest.findUniqueOrThrow({
    where: { id: input.returnRequestId },
    include: { orderItem: { include: { productVariant: true } } },
  });

  const inventoryRow = await prisma.inventory.findFirst({
    where: { productVariantId: before.orderItem.productVariantId },
  });
  if (!inventoryRow) {
    throw new Error(
      "no-inventory-row: no stock record exists for this variant to restock into",
    );
  }

  // The REQUESTED -> APPROVED transition is claimed via a conditional
  // updateMany inside the transaction (not a pre-checked `before.status`),
  // so two concurrent approvals of the same return can't both pass the
  // status check and both restock.
  const returnRequest = await prisma.$transaction(async (tx) => {
    const claimed = await tx.returnRequest.updateMany({
      where: { id: input.returnRequestId, status: "REQUESTED" },
      data: { status: "APPROVED", resolvedAt: new Date() },
    });
    if (claimed.count === 0) {
      const current = await tx.returnRequest.findUniqueOrThrow({
        where: { id: input.returnRequestId },
      });
      throw new Error(
        `not-pending: return request is already ${current.status}`,
      );
    }

    await tx.inventory.update({
      where: { id: inventoryRow.id },
      data: { quantityOnHand: { increment: before.orderItem.quantity } },
    });
    await tx.inventoryLog.create({
      data: {
        variantSku: before.orderItem.productVariant.sku,
        changeQty: before.orderItem.quantity,
        reason: "RETURN",
        actorType: "STAFF",
        actorId: actor.staffUserId,
      },
    });

    return tx.returnRequest.findUniqueOrThrow({
      where: { id: input.returnRequestId },
    });
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "return.approve",
    entityType: "ReturnRequest",
    entityId: input.returnRequestId,
    beforeState: { status: before.status },
    afterState: {
      status: returnRequest.status,
      restockedQty: before.orderItem.quantity,
      note: input.note ?? null,
    },
  });

  return returnRequest;
}
