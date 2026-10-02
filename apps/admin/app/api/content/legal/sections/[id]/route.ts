import { deleteLegalSection, updateLegalSection } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../../_lib/triggerCatalogRevalidate";

// Every field is optional: an omitted field is left alone.
const bodySchema = z.object({
  heading: z
    .string()
    .trim()
    .min(1, { error: "Give the point a heading." })
    .optional(),
  body: z
    .string()
    .trim()
    .min(1, { error: "Give the point some text." })
    .optional(),
  isActive: z.boolean().optional(),
});

const NOT_FOUND = "Couldn't find that point. Refresh and try again.";

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const section = await updateLegalSection(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, section });
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
      await deleteLegalSection(params.id, { staffUserId: staff.staffUserId });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 404 },
      );
    }
  },
);
