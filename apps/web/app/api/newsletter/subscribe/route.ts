import { isValidEmail, subscribeToNewsletter } from "@onwei/core";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_EMAIL" },
      { status: 400 },
    );
  }

  const result = await subscribeToNewsletter(email, "homepage_footer");
  return NextResponse.json({
    ok: true,
    alreadySubscribed: result.alreadySubscribed,
  });
}
