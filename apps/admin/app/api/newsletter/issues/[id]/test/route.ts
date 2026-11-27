import { getStaffAccess } from "@onwei/auth";
import { sendNewsletterTest } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { webUrl } from "../../../../insiders/_lib/insiderMail";

/** "Send me a test": the newsletter as saved, to the signed-in staff member. */
export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "newsletter:manage" },
  async ({ staff, params }) => {
    const access = await getStaffAccess(staff.staffUserId);
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "We couldn't find your account. Sign in again." },
        { status: 401 },
      );
    }
    const sent = await sendNewsletterTest(params.id, access.email, {
      siteUrl: webUrl(),
      secret: process.env.INSIDER_LINK_SECRET,
    });
    if (!sent) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The test email didn't go out. Save the newsletter, check the email settings, then try again.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: `Test sent to ${access.email}.`,
    });
  },
);
