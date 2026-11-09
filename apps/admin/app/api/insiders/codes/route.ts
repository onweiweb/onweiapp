import { assignMissingInsiderCodes } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

// Gives a code to every waitlist member who doesn't have one yet (people who
// joined before codes existed). Safe to press twice.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage" },
  async () => {
    const created = await assignMissingInsiderCodes();
    return NextResponse.json({ ok: true, created });
  },
);
