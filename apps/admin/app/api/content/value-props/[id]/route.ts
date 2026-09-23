import { deleteValueProp, updateValueProp } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  try {
    const prop = await updateValueProp(
      id,
      {
        illustrationUrl:
          typeof body.illustrationUrl === "string"
            ? body.illustrationUrl
            : undefined,
        width: typeof body.width === "number" ? body.width : undefined,
        height: typeof body.height === "number" ? body.height : undefined,
        title: typeof body.title === "string" ? body.title : undefined,
        body: typeof body.bodyText === "string" ? body.bodyText : undefined,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, valueProp: prop });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that value prop." },
      { status: 404 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const { id } = await params;
  try {
    await deleteValueProp(id, { staffUserId: session.context.staffUserId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that value prop." },
      { status: 404 },
    );
  }
}
