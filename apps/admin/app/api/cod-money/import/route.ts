import { checkCodImportRateLimit, importCodRemittances } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { ITHINK_NOT_SET_UP } from "../../orders/ithink/_messages";

export const maxDuration = 60;

/** Reads iThink's COD payouts for the last 14 days and marks orders paid out. */
export const POST = defineAdminRoute(
  { permission: "order:updateStatus" },
  async ({ staff }) => {
    if (!(await checkCodImportRateLimit(staff.staffUserId)).allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "That's a lot of updates. Wait a few minutes and try again.",
        },
        { status: 429 },
      );
    }
    const result = await importCodRemittances({
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: ITHINK_NOT_SET_UP },
        { status: 503 },
      );
    }
    const parts = [
      result.payouts === 0
        ? "No payouts in the last 14 days."
        : `${result.payouts} ${result.payouts === 1 ? "payout" : "payouts"} read.`,
      result.matched > 0
        ? `${result.matched} ${result.matched === 1 ? "order" : "orders"} marked as paid out.`
        : "",
      result.mismatched > 0
        ? `${result.mismatched} with a different amount (flagged on the order).`
        : "",
      result.missedDays > 0
        ? `iThink didn't answer for ${result.missedDays} ${result.missedDays === 1 ? "day" : "days"}, press again later.`
        : "",
    ].filter(Boolean);
    return NextResponse.json({ ok: true, message: parts.join(" ") });
  },
);
