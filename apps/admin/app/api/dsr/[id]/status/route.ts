import { updateDsrStatus } from "@onwei/core";
import type { DsrStatus } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

const VALID_STATUSES: DsrStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "FULFILLED",
  "REJECTED",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "dsr:updateStatus");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;

  const status = VALID_STATUSES.includes(body?.status as DsrStatus)
    ? (body!.status as DsrStatus)
    : null;

  if (!status) {
    return NextResponse.json(
      { ok: false, error: "Pick a valid status." },
      { status: 400 },
    );
  }

  try {
    const request_ = await updateDsrStatus(id, status, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true, request: request_ });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("invalid-transition")
        ? "That status change isn't allowed from here."
        : "Couldn't find that request.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
