import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type { AdjustInventoryInput, AuditActor } from "./types";

/**
 * Applies a signed quantity change to a variant's stock at a warehouse,
 * writes an InventoryLog row (the append-only history the storefront never
 * reads but ops needs for "why is this number what it is"), and an
 * AuditLog row (per docs/DATABASE_SCHEMA.md — inventory changes always get
 * one). A negative delta below zero on-hand is rejected rather than letting
 * stock go negative.
 */
export async function adjustInventory(
  input: AdjustInventoryInput,
  actor: AuditActor,
) {
  const before = await prisma.inventory.findUniqueOrThrow({
    where: {
      productVariantId_warehouseId: {
        productVariantId: input.productVariantId,
        warehouseId: input.warehouseId,
      },
    },
    include: { productVariant: true },
  });

  const newQuantity = before.quantityOnHand + input.delta;
  if (newQuantity < 0) {
    throw new Error(
      `Adjustment would take on-hand stock negative (currently ${before.quantityOnHand}, delta ${input.delta}).`,
    );
  }

  const [inventory] = await prisma.$transaction([
    prisma.inventory.update({
      where: {
        productVariantId_warehouseId: {
          productVariantId: input.productVariantId,
          warehouseId: input.warehouseId,
        },
      },
      data: { quantityOnHand: newQuantity },
    }),
    prisma.inventoryLog.create({
      data: {
        variantSku: before.productVariant.sku,
        changeQty: input.delta,
        reason: input.reason,
        actorType: "STAFF",
        actorId: actor.staffUserId,
      },
    }),
  ]);

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "inventory.adjust",
    entityType: "Inventory",
    entityId: inventory.id,
    beforeState: { quantityOnHand: before.quantityOnHand },
    afterState: {
      quantityOnHand: inventory.quantityOnHand,
      reason: input.reason,
    },
  });

  return inventory;
}

/** Flat variant x warehouse stock list for the admin inventory screen. */
export async function listInventory(options?: { lowStockOnly?: boolean }) {
  const rows = await prisma.inventory.findMany({
    include: {
      productVariant: { include: { product: true } },
      warehouse: true,
    },
    orderBy: { productVariant: { sku: "asc" } },
  });

  if (!options?.lowStockOnly) return rows;
  return rows.filter((row) => row.quantityOnHand <= row.reorderThreshold);
}
