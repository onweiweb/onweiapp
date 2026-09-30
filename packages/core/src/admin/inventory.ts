import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type { AdjustInventoryInput, AuditActor } from "./types";

/**
 * Applies a signed quantity change to a variant's stock at a warehouse,
 * writes an InventoryLog row (the append-only history the storefront never
 * reads but ops needs for "why is this number what it is"), and an
 * AuditLog row (per docs/DATABASE_SCHEMA.md, inventory changes always get
 * one). The mutation itself is a single atomic `UPDATE ... WHERE qty + delta
 * >= 0` (via `updateMany`'s row-count guard) rather than a read-compute-write,
 * so two concurrent adjustments can't lose an update or push stock negative.
 */
export async function adjustInventory(
  input: AdjustInventoryInput,
  actor: AuditActor,
) {
  const updateResult = await prisma.inventory.updateMany({
    where: {
      productVariantId: input.productVariantId,
      warehouseId: input.warehouseId,
      quantityOnHand: { gte: -input.delta },
    },
    data: { quantityOnHand: { increment: input.delta } },
  });

  if (updateResult.count === 0) {
    const existing = await prisma.inventory.findUnique({
      where: {
        productVariantId_warehouseId: {
          productVariantId: input.productVariantId,
          warehouseId: input.warehouseId,
        },
      },
    });
    if (!existing) {
      throw new Error(
        "No inventory row for that variant/warehouse combination.",
      );
    }
    throw new Error(
      `Adjustment would take on-hand stock negative (currently ${existing.quantityOnHand}, delta ${input.delta}).`,
    );
  }

  // The inventory row's own mutation already committed atomically above;
  // reading it back and writing its InventoryLog + AuditLog entries in one
  // transaction just means a failed log write can't leave the change
  // unlogged, not that the stock mutation itself is at risk.
  const inventory = await prisma.$transaction(async (tx) => {
    const row = await tx.inventory.findUniqueOrThrow({
      where: {
        productVariantId_warehouseId: {
          productVariantId: input.productVariantId,
          warehouseId: input.warehouseId,
        },
      },
      include: { productVariant: true },
    });
    const beforeQuantity = row.quantityOnHand - input.delta;

    await tx.inventoryLog.create({
      data: {
        productVariantId: row.productVariantId,
        variantSku: row.productVariant.sku,
        changeQty: input.delta,
        reason: input.reason,
        actorType: "STAFF",
        actorId: actor.staffUserId,
      },
    });

    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "inventory.adjust",
        entityType: "Inventory",
        entityId: row.id,
        beforeState: { quantityOnHand: beforeQuantity },
        afterState: {
          quantityOnHand: row.quantityOnHand,
          reason: input.reason,
        },
      },
      tx,
    );

    return row;
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
