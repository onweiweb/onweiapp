import { reorderReviewPlacements } from "@onwei/core";
import type { ReviewSurface } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

const SURFACES: ReviewSurface[] = ["HOME_HERO", "HOME_WALL", "PRODUCT_WALL"];

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "review:feature");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "Missing reorder details." },
      { status: 400 },
    );
  }

  const { surface, productId, orderedPlacementIds } = body as Record<
    string,
    unknown
  >;

  if (
    typeof surface !== "string" ||
    !SURFACES.includes(surface as ReviewSurface)
  ) {
    return NextResponse.json(
      { ok: false, error: "Choose a valid surface." },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(orderedPlacementIds) ||
    orderedPlacementIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing the new order." },
      { status: 400 },
    );
  }

  try {
    await reorderReviewPlacements(
      surface as ReviewSurface,
      typeof productId === "string" ? productId : null,
      orderedPlacementIds as string[],
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't save the new order." },
      { status: 400 },
    );
  }
}
