import { setReviewPlacement } from "@onwei/core";
import type { ReviewSurface } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

const SURFACES: ReviewSurface[] = ["HOME_HERO", "HOME_WALL", "PRODUCT_WALL"];

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "review:feature");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "Missing review placement details." },
      { status: 400 },
    );
  }

  const { surface, productId, reviewId } = body as Record<string, unknown>;

  if (
    typeof surface !== "string" ||
    !SURFACES.includes(surface as ReviewSurface)
  ) {
    return NextResponse.json(
      { ok: false, error: "Choose a valid surface." },
      { status: 400 },
    );
  }
  if (typeof reviewId !== "string" || reviewId.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Choose a review to feature." },
      { status: 400 },
    );
  }
  if (surface === "PRODUCT_WALL" && typeof productId !== "string") {
    return NextResponse.json(
      { ok: false, error: "A product wall placement needs a product." },
      { status: 400 },
    );
  }

  try {
    const placement = await setReviewPlacement(
      {
        surface: surface as ReviewSurface,
        productId: surface === "PRODUCT_WALL" ? (productId as string) : null,
        reviewId,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, placement }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("already-featured")
        ? "That review is already featured on this surface."
        : "Couldn't feature that review.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
