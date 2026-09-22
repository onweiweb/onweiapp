import { approveReview } from "@onwei/core";
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
    const review = await approveReview(id, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("already-approved")
        ? "This review is already live."
        : "Couldn't find that review.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
