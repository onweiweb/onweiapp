import { updateCategoryShipperBox } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const MESSAGE = "Enter the box's sides in cm and its empty weight in grams.";

const bodySchema = z.object({
  lengthCm: z.number({ error: MESSAGE }).nullable(),
  widthCm: z.number({ error: MESSAGE }).nullable(),
  heightCm: z.number({ error: MESSAGE }).nullable(),
  weightGrams: z.number({ error: MESSAGE }).nullable(),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "category:update",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body, params }) => {
    const result = await updateCategoryShipperBox(params.id, body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
