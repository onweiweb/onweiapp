import { deleteValueProp, updateValueProp } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

// Every field is optional: an omitted field is left alone.
const bodySchema = z.object({
  illustrationUrl: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  bodyText: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

const NOT_FOUND = "Couldn't find that value prop.";

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    const { bodyText, ...rest } = body;
    try {
      const valueProp = await updateValueProp(
        params.id,
        { ...rest, body: bodyText },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, valueProp });
    } catch {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 404 },
      );
    }
  },
);

export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "content:manage" },
  async ({ staff, params }) => {
    try {
      await deleteValueProp(params.id, { staffUserId: staff.staffUserId });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 404 },
      );
    }
  },
);
