import { deleteMarqueeItem, updateMarqueeItem } from "@onwei/core";
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
    const item = await updateMarqueeItem(
      id,
      {
        label: typeof body.label === "string" ? body.label : undefined,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that marquee item." },
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
    await deleteMarqueeItem(id, { staffUserId: session.context.staffUserId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that marquee item." },
      { status: 404 },
    );
  }
}
