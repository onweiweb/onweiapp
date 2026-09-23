import { removeReviewPlacement } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "review:feature");
  if (!session.ok) return session.response;

  const { id } = await params;
  try {
    await removeReviewPlacement(id, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that placement." },
      { status: 404 },
    );
  }
}
