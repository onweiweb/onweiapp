import { approveReturn } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "return:approve" },
  async ({ staff, params }) => {
    try {
      const returnRequest = await approveReturn(
        { returnRequestId: params.id },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, returnRequest });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("not-pending")
          ? "This return was already resolved."
          : "Couldn't find that return request.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
