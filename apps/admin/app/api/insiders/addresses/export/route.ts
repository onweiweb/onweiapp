import { listAllCardAddresses } from "@onwei/core";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

function cell(value: string | null | undefined): string {
  const text = value ?? "";
  // Quote everything; neutralise spreadsheet formulas (=, +, -, @).
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Addresses still to post, ready for a courier sheet. ?all=1 includes posted.
export const GET = defineAdminRoute(
  { permission: "waitlist:view" },
  async ({ request }) => {
    const all = new URL(request.url).searchParams.get("all") === "1";
    const rows = await listAllCardAddresses(all ? "all" : "toPost");
    const header = [
      "Name",
      "Phone",
      "Address line 1",
      "Address line 2",
      "City",
      "State",
      "PIN code",
      "Insider code",
      "Shared on",
      "Posted on",
    ];
    const lines = rows.map((row) =>
      [
        row.fullName,
        row.phone,
        row.line1,
        row.line2,
        row.city,
        row.state,
        row.postalCode,
        row.insiderCode,
        row.submittedAt.toISOString().slice(0, 10),
        row.postedAt ? row.postedAt.toISOString().slice(0, 10) : "",
      ]
        .map(cell)
        .join(","),
    );
    const csv = [header.map(cell).join(","), ...lines].join("\r\n");
    return new Response(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="insider-card-addresses-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
);
