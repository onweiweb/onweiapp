import { getAccountSummary } from "@onwei/core";
import { NextResponse } from "next/server";
import { customerIdFrom } from "../../_lib/requestAuth";

export const dynamic = "force-dynamic";

/** Who is signed in, for the header, the entry pop-up and checkout. */
export async function GET(request: Request) {
  const customerId = await customerIdFrom(request);
  const account = customerId ? await getAccountSummary(customerId) : null;
  if (!account) return NextResponse.json({ ok: true, signedIn: false });
  return NextResponse.json({
    ok: true,
    signedIn: true,
    name: account.name,
    email: account.emailVerified ? account.email : null,
    phone: account.phoneVerified ? account.phone : null,
    insider: account.insider
      ? { code: account.insider.code, percent: account.insider.percent }
      : null,
  });
}
