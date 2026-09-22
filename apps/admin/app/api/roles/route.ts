import { createRole } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "role:create");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    description?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Enter a name for this role." },
      { status: 400 },
    );
  }

  try {
    const role = await createRole(
      {
        name,
        description:
          typeof body?.description === "string" ? body.description : null,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, role }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A role with that name already exists."
        : "Couldn't create that role.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
