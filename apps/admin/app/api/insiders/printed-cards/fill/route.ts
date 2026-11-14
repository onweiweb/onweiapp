import { fillInsiderCodePool, PRINT_RUN_SIZE } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

// Makes codes for the printed Insider cards, up to PRINT_RUN_SIZE in all.
// Members who already have a code get a card first. Safe to press twice.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage" },
  async ({ staff }) => {
    try {
      const result = await fillInsiderCodePool({
        staffUserId: staff.staffUserId,
        target: PRINT_RUN_SIZE,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      console.error("[insiders] printed card fill failed", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "The cards couldn't be set up. Nothing was changed. Try again.",
        },
        { status: 500 },
      );
    }
  },
);
