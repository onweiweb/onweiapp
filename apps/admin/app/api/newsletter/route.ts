import { subscribeToNewsletter } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "newsletter:manage");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    source?: unknown;
  } | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const source =
    typeof body?.source === "string" && body.source.trim()
      ? body.source.trim()
      : "admin_manual";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const result = await subscribeToNewsletter(email, source);
  return NextResponse.json({
    ok: true,
    alreadySubscribed: result.alreadySubscribed,
  });
}
