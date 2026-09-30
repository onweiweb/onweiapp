import { createCategory } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { optionalText, requiredText } from "../_lib/schemas";
import { triggerCatalogRevalidate } from "../_lib/triggerCatalogRevalidate";

export const GET = defineAdminRoute({}, async () => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ ok: true, categories });
});

const MESSAGE = "Give the category a name and a URL slug.";

const bodySchema = z.object({
  name: requiredText(MESSAGE),
  slug: requiredText(MESSAGE),
  parentId: z.string().nullish(),
  imageUrl: z.string().nullish(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  metaTitle: optionalText,
  metaDescription: optionalText,
});

export const POST = defineAdminRoute(
  {
    permission: "category:create",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body }) => {
    const category = await createCategory(
      {
        name: body.name,
        slug: body.slug,
        parentId: body.parentId ?? null,
        imageUrl: body.imageUrl ?? null,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
      },
      { staffUserId: staff.staffUserId },
    );

    await triggerCatalogRevalidate();
    return NextResponse.json({ ok: true, category }, { status: 201 });
  },
);
