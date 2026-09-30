import { addDiscountRule } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const MESSAGE = "Pick a discount type and fill in its details.";

const bodySchema = z.object({
  type: z.enum(["PERCENTAGE", "FLAT", "BUY_X_GET_Y"], { error: MESSAGE }),
  config: z.record(z.string(), z.unknown(), { error: MESSAGE }),
  priority: z.number().optional(),
  stackable: z.boolean().optional(),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "discountRule:create",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body, params }) => {
    try {
      const rule = await addDiscountRule(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, rule }, { status: 201 });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("invalid-config")
          ? error.message.replace("invalid-config: ", "")
          : "Couldn't add that rule.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
