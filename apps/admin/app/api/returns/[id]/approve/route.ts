import { approveReturn } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "return:approve");
  if (!session.ok) return session.response;

  const { id } = await params;

  try {
    const returnRequest = await approveReturn(
      { returnRequestId: id },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, returnRequest });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("not-pending")
        ? "This return was already resolved."
        : "Couldn't find that return request.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
