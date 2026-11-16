import { searchInsiderRecipients } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

// Search for the "Send to chosen Insiders" picker: name, email or code.
export const GET = defineAdminRoute(
  { permission: "waitlist:manage" },
  async ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const rows = await searchInsiderRecipients(q.slice(0, 100));
    return NextResponse.json({ ok: true, rows });
  },
);
