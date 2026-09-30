import { createArticle } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { requiredText } from "../../_lib/schemas";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";

const MESSAGE = "Give the article a title and a URL slug.";

const bodySchema = z.object({
  title: requiredText(MESSAGE),
  slug: requiredText(MESSAGE),
  excerpt: z.string().nullish(),
  bodyHtml: z.string().default(""),
  coverImageUrl: z.string().nullish(),
  isPublished: z.boolean().default(false),
});

export const POST = defineAdminRoute(
  { permission: "content:manage", body: bodySchema, emptyBodyMessage: MESSAGE },
  async ({ staff, body }) => {
    try {
      const article = await createArticle(
        {
          title: body.title,
          slug: body.slug,
          excerpt: body.excerpt ?? null,
          bodyHtml: body.bodyHtml,
          coverImageUrl: body.coverImageUrl ?? null,
          isPublished: body.isPublished,
        },
        { staffUserId: staff.staffUserId },
      );
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, article }, { status: 201 });
    } catch {
      return NextResponse.json(
        { ok: false, error: "That URL slug is already in use." },
        { status: 400 },
      );
    }
  },
);
