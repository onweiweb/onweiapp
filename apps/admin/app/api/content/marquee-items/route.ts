import { createMarqueeItem } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  placement: z.enum(["HOME_HERO", "HOME_SHOWCASE", "PDP"], {
    error: "Choose a valid marquee.",
  }),
  label: z
    .string({ error: "Enter the ticker text." })
    .min(1, { error: "Enter the ticker text." }),
  sortOrder: z.number().optional(),
});

export const POST = defineAdminRoute(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Missing marquee item details.",
  },
  async ({ staff, body }) => {
    const item = await createMarqueeItem(body, {
      staffUserId: staff.staffUserId,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  },
);
