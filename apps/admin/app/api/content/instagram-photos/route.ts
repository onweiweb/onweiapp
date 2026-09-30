import { createInstagramPhoto } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  imageUrl: z
    .string({ error: "Enter an image URL." })
    .min(1, { error: "Enter an image URL." }),
  altText: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const POST = defineAdminRoute(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Missing photo details.",
  },
  async ({ staff, body }) => {
    const photo = await createInstagramPhoto(
      {
        imageUrl: body.imageUrl,
        altText: body.altText ? body.altText : null,
        sortOrder: body.sortOrder,
      },
      { staffUserId: staff.staffUserId },
    );
    return NextResponse.json({ ok: true, photo }, { status: 201 });
  },
);
