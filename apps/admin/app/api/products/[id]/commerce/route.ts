import { updateProductCommerce } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const bodySchema = z.object({
  isReturnable: z.boolean(),
  hsnCode: z.string().max(12).nullable(),
  gstRate: z.number().nullable(),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "product:update", body: bodySchema },
  async ({ staff, body, params }) => {
    const result = await updateProductCommerce(params.id, body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok)
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    return NextResponse.json({ ok: true });
  },
);
