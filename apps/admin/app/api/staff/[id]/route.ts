import { updateStaffUser } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  name: z
    .string()
    .trim()
    .optional()
    .transform((name) => name || undefined),
  isActive: z.boolean().optional(),
  resetPassword: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 8, {
      error: "New password must be at least 8 characters.",
    })
    .optional()
    .transform((value) => value || undefined),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "staffUser:update", body: bodySchema },
  async ({ staff, body, params }) => {
    try {
      const staffUser = await updateStaffUser(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, staffUser });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("self-deactivate")
          ? "You can't deactivate your own account, ask another admin to do it."
          : "Couldn't find that staff account.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
