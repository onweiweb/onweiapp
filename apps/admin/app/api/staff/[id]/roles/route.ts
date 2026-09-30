import { assignStaffRole, unassignStaffRole } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { requiredText } from "../../../_lib/schemas";

const assignSchema = z.object({
  roleId: requiredText("Pick a role to assign."),
});

export const POST = defineAdminRoute<typeof assignSchema, { id: string }>(
  {
    permission: "staffUserRole:assign",
    body: assignSchema,
    emptyBodyMessage: "Pick a role to assign.",
  },
  async ({ staff, body, params }) => {
    try {
      await assignStaffRole(params.id, body.roleId, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't assign that role." },
        { status: 400 },
      );
    }
  },
);

export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "staffUserRole:assign" },
  async ({ request, staff, params }) => {
    const roleId = new URL(request.url).searchParams.get("roleId") ?? "";
    if (!roleId) {
      return NextResponse.json(
        { ok: false, error: "Pick a role to remove." },
        { status: 400 },
      );
    }

    try {
      await unassignStaffRole(params.id, roleId, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("self-unassign")
          ? "You can't remove your own last role, ask another admin to do it."
          : "Couldn't remove that role.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
