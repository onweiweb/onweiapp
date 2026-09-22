import { assignStaffRole, unassignStaffRole } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "staffUserRole:assign");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    roleId?: unknown;
  } | null;
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";

  if (!roleId) {
    return NextResponse.json(
      { ok: false, error: "Pick a role to assign." },
      { status: 400 },
    );
  }

  try {
    await assignStaffRole(id, roleId, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't assign that role." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "staffUserRole:assign");
  if (!session.ok) return session.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get("roleId") ?? "";

  if (!roleId) {
    return NextResponse.json(
      { ok: false, error: "Pick a role to remove." },
      { status: 400 },
    );
  }

  try {
    await unassignStaffRole(id, roleId, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("self-unassign")
        ? "You can't remove your own last role — ask another admin to do it."
        : "Couldn't remove that role.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
