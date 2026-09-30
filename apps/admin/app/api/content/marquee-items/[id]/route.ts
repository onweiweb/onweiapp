import { deleteMarqueeItem, updateMarqueeItem } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

// Every field is optional: an omitted field is left alone.
const bodySchema = z.object({
  label: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

const NOT_FOUND = "Couldn't find that marquee item.";

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const item = await updateMarqueeItem(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, item });
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
      await deleteMarqueeItem(params.id, { staffUserId: staff.staffUserId });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 404 },
      );
    }
  },
);
