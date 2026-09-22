import { updateStaffUser } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "staffUser:update");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    isActive?: unknown;
    resetPassword?: unknown;
  } | null;

  if (
    typeof body?.resetPassword === "string" &&
    body.resetPassword.length > 0 &&
    body.resetPassword.length < 8
  ) {
    return NextResponse.json(
      { ok: false, error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const staffUser = await updateStaffUser(
      id,
      {
        name: typeof body?.name === "string" ? body.name.trim() : undefined,
        isActive:
          typeof body?.isActive === "boolean" ? body.isActive : undefined,
        resetPassword:
          typeof body?.resetPassword === "string" && body.resetPassword
            ? body.resetPassword
            : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, staffUser });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("self-deactivate")
        ? "You can't deactivate your own account — ask another admin to do it."
        : "Couldn't find that staff account.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
