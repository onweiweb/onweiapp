import { exportWaitlistEntriesToCsv } from "@onwei/core";
import { requireStaffSession } from "../../_lib/requireStaffSession";

export async function GET(request: Request) {
  const session = await requireStaffSession(request, "waitlist:view");
  if (!session.ok) return session.response;

  const csv = await exportWaitlistEntriesToCsv();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
