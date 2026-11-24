import { CARD_SEND_BATCH, sendInsiderCards } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { NOT_SET_UP } from "../_messages";

// One iThink call (up to 10 cards) per request. The page calls again until
// nobody is left.
export const maxDuration = 60;

const bodySchema = z.object({
  addressIds: z.array(z.string().min(1)).min(1).max(CARD_SEND_BATCH).optional(),
  max: z.number().int().min(1).max(CARD_SEND_BATCH).optional(),
});

export const POST = defineAdminRoute(
  {
    permission: "waitlist:manage",
    body: bodySchema,
    emptyBodyMessage: "Say which cards to send.",
  },
  async ({ staff, body }) => {
    const result = await sendInsiderCards(body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: NOT_SET_UP },
        { status: 503 },
      );
    }
    return NextResponse.json(result);
  },
);
