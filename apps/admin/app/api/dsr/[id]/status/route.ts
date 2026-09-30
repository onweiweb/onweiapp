import { updateDsrStatus } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const bodySchema = z.object({
  status: z.enum(["RECEIVED", "IN_PROGRESS", "FULFILLED", "REJECTED"], {
    error: "Pick a valid status.",
  }),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "dsr:updateStatus",
    body: bodySchema,
    emptyBodyMessage: "Pick a valid status.",
  },
  async ({ staff, body, params }) => {
    try {
      const request = await updateDsrStatus(params.id, body.status, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, request });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("invalid-transition")
          ? "That status change isn't allowed from here."
          : "Couldn't find that request.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
