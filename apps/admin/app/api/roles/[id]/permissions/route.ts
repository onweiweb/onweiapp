import { updateRolePermissions } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "role:update");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    permissionKeys?: unknown;
  } | null;

  const permissionKeys = Array.isArray(body?.permissionKeys)
    ? body.permissionKeys.filter(
        (key): key is string => typeof key === "string",
      )
    : null;

  if (!permissionKeys) {
    return NextResponse.json(
      { ok: false, error: "Pick which permissions this role should have." },
      { status: 400 },
    );
  }

  try {
    const role = await updateRolePermissions(id, permissionKeys, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true, role });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that role." },
      { status: 404 },
    );
  }
}
