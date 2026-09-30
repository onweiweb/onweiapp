import { deleteArticle, updateArticle } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";

// Every field is optional: an omitted field is left alone, null clears
// excerpt and cover image.
const bodySchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  bodyHtml: z.string().optional(),
  coverImageUrl: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
});

const NOT_FOUND = "Couldn't find that article.";

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const article = await updateArticle(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, article });
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
      await deleteArticle(params.id, { staffUserId: staff.staffUserId });
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
