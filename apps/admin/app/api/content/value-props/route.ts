import { createValueProp } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const MESSAGE = "Fill in the illustration, size, title, and body.";

const bodySchema = z.object({
  illustrationUrl: z.string({ error: MESSAGE }).min(1, { error: MESSAGE }),
  width: z.number({ error: MESSAGE }),
  height: z.number({ error: MESSAGE }),
  title: z.string({ error: MESSAGE }).min(1, { error: MESSAGE }),
  bodyText: z.string({ error: MESSAGE }).min(1, { error: MESSAGE }),
  sortOrder: z.number().optional(),
});

export const POST = defineAdminRoute(
  {
    permission: "content:manage",
    body: bodySchema,
    emptyBodyMessage: "Missing value prop details.",
  },
  async ({ staff, body }) => {
    const { bodyText, ...rest } = body;
    const valueProp = await createValueProp(
      { ...rest, body: bodyText },
      { staffUserId: staff.staffUserId },
    );
    return NextResponse.json({ ok: true, valueProp }, { status: 201 });
  },
);
