import { setContactMessageStatus } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({ status: z.enum(["NEW", "REPLIED"]) });

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "customer:view", body: bodySchema },
  async ({ staff, body, params }) => {
    const result = await setContactMessageStatus(params.id, body.status, {
      staffUserId: staff.staffUserId,
    });
    if (result.ok) return NextResponse.json({ ok: true });
    return NextResponse.json(
      {
        ok: false,
        error: "Someone else already changed this message. Refresh to see it.",
      },
      { status: 409 },
    );
  },
);
