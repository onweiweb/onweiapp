import { rejectReview } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "review:moderate");
  if (!session.ok) return session.response;

  const { id } = await params;

  try {
    const review = await rejectReview(id, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true, review });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that review." },
      { status: 404 },
    );
  }
}
