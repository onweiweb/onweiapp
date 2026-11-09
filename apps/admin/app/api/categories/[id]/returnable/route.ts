import { setCategoryReturnable } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const bodySchema = z.object({ isReturnable: z.boolean() });

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "category:update", body: bodySchema },
  async ({ staff, body, params }) => {
    await setCategoryReturnable(params.id, body.isReturnable, {
      staffUserId: staff.staffUserId,
    });
    return NextResponse.json({ ok: true });
  },
);
