import { createStaffUser } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "staffUser:create");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    initialPassword?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const initialPassword =
    typeof body?.initialPassword === "string" ? body.initialPassword : "";

  if (!email || !name || initialPassword.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Enter an email, a name, and a password of at least 8 characters.",
      },
      { status: 400 },
    );
  }

  try {
    const staffUser = await createStaffUser(
      { email, name, initialPassword },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, staffUser }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Someone already has an account with that email."
        : "Couldn't create that staff account.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
