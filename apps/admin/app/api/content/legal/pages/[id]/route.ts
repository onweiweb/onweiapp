import { updateLegalPage } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../../_lib/triggerCatalogRevalidate";

const bodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "The page needs a title." })
    .optional(),
  intro: z.string().nullable().optional(),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const page = await updateLegalPage(
        params.id,
        { title: body.title, intro: body.intro?.trim() || null },
        { staffUserId: staff.staffUserId },
      );
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, page });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that page. Refresh and try again." },
        { status: 404 },
      );
    }
  },
);
