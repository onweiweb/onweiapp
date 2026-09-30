import { createRole } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { optionalText, requiredText } from "../_lib/schemas";

const bodySchema = z.object({
  name: requiredText("Enter a name for this role."),
  description: optionalText,
});

export const POST = defineAdminRoute(
  { permission: "role:create", body: bodySchema },
  async ({ staff, body }) => {
    try {
      const role = await createRole(
        { name: body.name, description: body.description ?? null },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, role }, { status: 201 });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.includes("Unique constraint")
          ? "A role with that name already exists."
          : "Couldn't create that role.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
