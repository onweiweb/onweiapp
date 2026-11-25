import { exportApplicationsCsv } from "@onwei/core";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { applicationFiltersFrom } from "../../../../insiders/_applicationFilters";

// The Applications list as a spreadsheet, with the same filters as the page.
export const GET = defineAdminRoute(
  { permission: "waitlist:view" },
  async ({ request }) => {
    const url = new URL(request.url);
    const csv = await exportApplicationsCsv(
      applicationFiltersFrom(Object.fromEntries(url.searchParams)),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="insider-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
);
