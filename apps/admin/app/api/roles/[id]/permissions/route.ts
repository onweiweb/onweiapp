import { updateRolePermissions } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const MESSAGE = "Pick which permissions this role should have.";

const bodySchema = z.object({
  permissionKeys: z.array(z.string(), { error: MESSAGE }),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "role:update", body: bodySchema, emptyBodyMessage: MESSAGE },
  async ({ staff, body, params }) => {
    try {
      const role = await updateRolePermissions(params.id, body.permissionKeys, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, role });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that role." },
        { status: 404 },
      );
    }
  },
);
