import { refreshCardShipments } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { NOT_SET_UP } from "../_messages";

export const maxDuration = 60;

// `startedAt`: when this "Update all" began, so each card is asked about
// once per press even across several requests.
const bodySchema = z.object({ startedAt: z.iso.datetime() });

export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body }) => {
    const result = await refreshCardShipments({
      startedAt: new Date(body.startedAt),
      max: 50,
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
