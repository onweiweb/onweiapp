import { updateReviewSurfaceLimit } from "@onwei/core";
import type { ReviewSurface } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

const SURFACES: ReviewSurface[] = ["HOME_HERO", "HOME_WALL", "PRODUCT_WALL"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ surface: string }> },
) {
  const session = await requireStaffSession(request, "review:feature");
  if (!session.ok) return session.response;

  const { surface } = await params;
  if (!SURFACES.includes(surface as ReviewSurface)) {
    return NextResponse.json(
      { ok: false, error: "Unknown surface." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const limit =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).limit
      : null;

  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    return NextResponse.json(
      { ok: false, error: "Enter a whole number of at least 1." },
      { status: 400 },
    );
  }

  const config = await updateReviewSurfaceLimit(
    surface as ReviewSurface,
    limit,
    {
      staffUserId: session.context.staffUserId,
    },
  );
  return NextResponse.json({ ok: true, config });
}
