import { removeProductImage } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../../_lib/requireStaffSession";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const session = await requireStaffSession(request, "productImage:manage");
  if (!session.ok) return session.response;

  const { imageId } = await params;
  try {
    await removeProductImage(imageId, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that image." },
      { status: 404 },
    );
  }
}
