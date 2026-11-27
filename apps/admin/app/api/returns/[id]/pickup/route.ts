import {
  bookReturnPickup,
  cancelReturnPickup,
  refreshReturnPickups,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const maxDuration = 60;

const bodySchema = z.object({ action: z.enum(["book", "cancel", "refresh"]) });

/** Book, cancel or update the iThink courier pickup for an approved return. */
export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "return:approve", body: bodySchema },
  async ({ staff, body, params }) => {
    const actor = { staffUserId: staff.staffUserId };
    if (body.action === "refresh") {
      const result = await refreshReturnPickups({ returnId: params.id });
      return NextResponse.json({
        ok: true,
        message: result.changed > 0 ? "Updated from iThink." : "No change.",
      });
    }
    const result =
      body.action === "book"
        ? await bookReturnPickup(params.id, actor)
        : await cancelReturnPickup(params.id, actor);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.message },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      message:
        body.action === "book"
          ? `Pickup booked, tracking number ${"awb" in result ? result.awb : ""}. The courier collects it from the customer.`
          : "Pickup cancelled.",
    });
  },
);
