import { updateCategory } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";

// Every field is optional: an omitted field is left alone, null clears it.
const bodySchema = z.object({
  name: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  parentId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "category:update",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const category = await updateCategory(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, category });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that category." },
        { status: 404 },
      );
    }
  },
);
