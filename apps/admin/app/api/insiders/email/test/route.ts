import { NextResponse } from "next/server";
import { getStaffAccess } from "@onwei/auth";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { insiderSender, renderFor } from "../../_lib/insiderMail";

// Sends the real Insider email, with a sample name and code, to the signed-in
// staff member. The links inside point at a sample member and won't open.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage" },
  async ({ staff }) => {
    const access = await getStaffAccess(staff.staffUserId);
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "We couldn't find your account. Sign in again." },
        { status: 401 },
      );
    }
    try {
      const email = renderFor({
        id: "sample",
        fullName: access.name || "Priya Shah",
        insiderCode: "WEI7820",
      });
      await insiderSender().send(access.email, {
        ...email,
        subject: `[Test] ${email.subject}`,
      });
    } catch (error) {
      console.error("[insiders] test send failed", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "The test email didn't go out. Check the email settings, then try again.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, sentTo: access.email });
  },
);
