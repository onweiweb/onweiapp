import type { Prisma } from "@onwei/database";
import { prisma } from "@onwei/database";

/**
 * Every admin write function in this directory calls this, per
 * docs/DATABASE_SCHEMA.md: "An audit-log entry for anything that touches
 * money, inventory, or access." Not just inventory: every category/product/
 * variant/image write too, since all of them are admin-authored changes to
 * customer-facing data.
 *
 * Pass a transaction client (the `tx` a `prisma.$transaction(async (tx) =>
 * ...)` callback receives) when the audit entry should commit atomically
 * with the write it's documenting, e.g. inventory adjustments and return
 * approvals, otherwise a failed log write silently leaves an unlogged
 * money/inventory change. Defaults to the global client for call sites that
 * don't need that guarantee.
 */
export async function writeAuditLog(
  input: {
    staffUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
  },
  client: Pick<Prisma.TransactionClient, "auditLog"> = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorType: "STAFF",
      staffUserId: input.staffUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      // Round-tripped through JSON to guarantee a plain JSON-serializable
      // value (Prisma's Decimal/Date instances aren't otherwise), which is
      // what the Json column actually stores.
      beforeState:
        input.beforeState != null
          ? JSON.parse(JSON.stringify(input.beforeState))
          : undefined,
      afterState:
        input.afterState != null
          ? JSON.parse(JSON.stringify(input.afterState))
          : undefined,
    },
  });
}
