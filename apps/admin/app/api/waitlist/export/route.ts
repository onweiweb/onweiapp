import { exportWaitlistEntriesToCsv } from "@onwei/core";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

export const GET = defineAdminRoute(
  { permission: "waitlist:view" },
  async () => {
    const csv = await exportWaitlistEntriesToCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
);
