import { actOnFailedDelivery } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";

export const maxDuration = 30;

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("REATTEMPT"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day to try again."),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine(
        (v) => v === "" || v.replace(/\D/g, "").length >= 10,
        "Enter a 10-digit phone number, or leave it empty.",
      )
      .optional(),
    address: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("RTO"),
    remark: z.string().trim().min(1, "Say why it's coming back.").max(200),
  }),
]);

/** The courier couldn't deliver: try again on a day, or send it back to us. */
export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "order:updateStatus", body: bodySchema },
  async ({ staff, body, params }) => {
    const result = await actOnFailedDelivery(
      params.id,
      body.action === "REATTEMPT"
        ? {
            kind: "REATTEMPT",
            // Noon India time on the chosen day.
            date: new Date(`${body.date}T12:00:00+05:30`),
            ...(body.phone ? { phone: body.phone } : {}),
            ...(body.address ? { address: body.address } : {}),
          }
        : { kind: "RTO", remark: body.remark },
      { staffUserId: staff.staffUserId },
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.message },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      message:
        body.action === "REATTEMPT"
          ? "Sent to iThink. The courier will try again on that day."
          : "Sent to iThink. The parcel is coming back to us.",
    });
  },
);
