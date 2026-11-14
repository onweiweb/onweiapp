import { insiderCardQrLink, listPrintedCodesForPrint } from "@onwei/core";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { toCsv } from "../../../../_lib/csv";

// The list for the printer: card number, code and the link the QR opens.
// Codes only, no names or addresses. ?from=N starts at card N (for a reprint).
export const GET = defineAdminRoute(
  { permission: "waitlist:view" },
  async ({ request }) => {
    const fromParam = Number(new URL(request.url).searchParams.get("from"));
    const from = Number.isInteger(fromParam) && fromParam > 0 ? fromParam : 1;
    const rows = await listPrintedCodesForPrint(from);
    const qr = insiderCardQrLink(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.onwei.in",
    );
    const csv = toCsv([
      ["Card number", "Code", "QR link"],
      ...rows.map((row) => [row.cardNumber, row.code, qr]),
    ]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="insider-cards-for-printer-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
);
