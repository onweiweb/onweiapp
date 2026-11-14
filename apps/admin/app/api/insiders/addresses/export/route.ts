import { listAllCardAddresses } from "@onwei/core";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { toCsv } from "../../../../_lib/csv";

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
      "Card number",
      "Shared on",
      "Posted on",
    ];
    const csv = toCsv([
      header,
      ...rows.map((row) => [
        row.fullName,
        row.phone,
        row.line1,
        row.line2,
        row.city,
        row.state,
        row.postalCode,
        row.insiderCode,
        row.cardNumber,
        row.submittedAt.toISOString().slice(0, 10),
        row.postedAt ? row.postedAt.toISOString().slice(0, 10) : "",
      ]),
    ]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="insider-card-addresses-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
);
