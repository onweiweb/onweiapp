import { setCardPosted } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const bodySchema = z.object({ posted: z.boolean() });

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body, staff, params }) => {
    const result = await setCardPosted(params.id, body.posted, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.reason === "SHIPPING"
              ? "This card is going through iThink, so it's marked posted when the courier picks it up. Cancel the iThink booking first to post it by hand."
              : "This address is no longer here. Refresh the page.",
        },
        { status: result.reason === "SHIPPING" ? 409 : 404 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
