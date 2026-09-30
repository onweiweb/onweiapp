import { createStaffUser } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { requiredText } from "../_lib/schemas";

const CREATE_MESSAGE =
  "Enter an email, a name, and a password of at least 8 characters.";

const bodySchema = z.object({
  email: requiredText(CREATE_MESSAGE),
  name: requiredText(CREATE_MESSAGE),
  initialPassword: z
    .string({ error: CREATE_MESSAGE })
    .min(8, { error: CREATE_MESSAGE }),
});

export const POST = defineAdminRoute(
  { permission: "staffUser:create", body: bodySchema },
  async ({ staff, body }) => {
    try {
      const staffUser = await createStaffUser(body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, staffUser }, { status: 201 });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.includes("Unique constraint")
          ? "Someone already has an account with that email."
          : "Couldn't create that staff account.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
