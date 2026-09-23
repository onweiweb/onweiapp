import { deleteInstagramPhoto, updateInstagramPhoto } from "@onwei/core";
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
    const photo = await updateInstagramPhoto(
      id,
      {
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
        altText: typeof body.altText === "string" ? body.altText : undefined,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, photo });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that photo." },
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
    await deleteInstagramPhoto(id, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that photo." },
      { status: 404 },
    );
  }
}
