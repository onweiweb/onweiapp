import { markCodCollected } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { actionError } from "../../../_lib/orderActionResponse";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "order:updateStatus" },
  async ({ staff, params }) => {
    try {
      await markCodCollected(params.id, { staffUserId: staff.staffUserId });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return actionError(error);
    }
  },
);
