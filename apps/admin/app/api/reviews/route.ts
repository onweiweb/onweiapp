import { createManualReview } from "@onwei/core";
import type { ReviewTarget } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

const VALID_TARGETS: ReviewTarget[] = ["PRODUCT", "BRAND"];

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "review:createManual");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    targetType?: unknown;
    productId?: unknown;
    rating?: unknown;
    title?: unknown;
    body?: unknown;
    authorDisplay?: unknown;
  } | null;

  const targetType = VALID_TARGETS.includes(body?.targetType as ReviewTarget)
    ? (body!.targetType as ReviewTarget)
    : null;
  const rating = typeof body?.rating === "number" ? body.rating : NaN;
  const reviewBody = typeof body?.body === "string" ? body.body.trim() : "";

  if (
    !targetType ||
    Number.isNaN(rating) ||
    rating < 1 ||
    rating > 5 ||
    !reviewBody
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Pick who it's for, a rating from 1-5, and write the review.",
      },
      { status: 400 },
    );
  }
  if (targetType === "PRODUCT" && typeof body?.productId !== "string") {
    return NextResponse.json(
      { ok: false, error: "Pick which product this review is for." },
      { status: 400 },
    );
  }

  try {
    const review = await createManualReview(
      {
        targetType,
        productId: typeof body?.productId === "string" ? body.productId : null,
        rating,
        title: typeof body?.title === "string" ? body.title : null,
        body: reviewBody,
        authorDisplay:
          typeof body?.authorDisplay === "string" ? body.authorDisplay : null,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't add that review." },
      { status: 400 },
    );
  }
}
