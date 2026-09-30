import { updateDiscountRule } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";

// Every field is optional: an omitted field is left alone.
const bodySchema = z.object({
  type: z.enum(["PERCENTAGE", "FLAT", "BUY_X_GET_Y"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().optional(),
  stackable: z.boolean().optional(),
});

export const PATCH = defineAdminRoute<
  typeof bodySchema,
  { id: string; ruleId: string }
>(
  { permission: "discountRule:update", body: bodySchema },
  async ({ staff, body, params }) => {
    try {
      const rule = await updateDiscountRule(params.ruleId, body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, rule });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("invalid-config")
          ? error.message.replace("invalid-config: ", "")
          : "Couldn't update that rule.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
