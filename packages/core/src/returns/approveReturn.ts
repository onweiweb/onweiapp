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

  if (before.status !== "REQUESTED") {
    throw new Error(`not-pending: return request is already ${before.status}`);
  }

  const inventoryRow = await prisma.inventory.findFirst({
    where: { productVariantId: before.orderItem.productVariantId },
  });
  if (!inventoryRow) {
    throw new Error(
      "no-inventory-row: no stock record exists for this variant to restock into",
    );
  }

  const [returnRequest] = await prisma.$transaction([
    prisma.returnRequest.update({
      where: { id: input.returnRequestId },
      data: { status: "APPROVED", resolvedAt: new Date() },
    }),
    prisma.inventory.update({
      where: { id: inventoryRow.id },
      data: { quantityOnHand: { increment: before.orderItem.quantity } },
    }),
    prisma.inventoryLog.create({
      data: {
        variantSku: before.orderItem.productVariant.sku,
        changeQty: before.orderItem.quantity,
        reason: "RETURN",
        actorType: "STAFF",
        actorId: actor.staffUserId,
      },
    }),
  ]);

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
