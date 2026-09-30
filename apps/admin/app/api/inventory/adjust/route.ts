import { adjustInventory } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const MESSAGE =
  "Pick a variant and warehouse, enter a non-zero quantity change, and choose a reason.";

const bodySchema = z.object({
  productVariantId: z.string({ error: MESSAGE }).min(1, { error: MESSAGE }),
  warehouseId: z.string({ error: MESSAGE }).min(1, { error: MESSAGE }),
  delta: z
    .number({ error: MESSAGE })
    .int({ error: MESSAGE })
    .refine((delta) => delta !== 0, { error: MESSAGE }),
  reason: z.enum(["RESTOCK", "RETURN", "ADJUSTMENT"], { error: MESSAGE }),
});

export const POST = defineAdminRoute(
  {
    permission: "inventory:adjust",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body }) => {
    try {
      const inventory = await adjustInventory(body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, inventory });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.includes("negative")
          ? "That would take stock below zero, check the quantity and try again."
          : "Couldn't find that variant/warehouse combination.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
