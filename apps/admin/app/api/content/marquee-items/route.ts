import { createMarqueeItem } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

const PLACEMENTS = ["HOME_HERO", "HOME_SHOWCASE", "PDP"];

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "Missing marquee item details." },
      { status: 400 },
    );
  }
  const { placement, label, sortOrder } = body as Record<string, unknown>;

  if (typeof placement !== "string" || !PLACEMENTS.includes(placement)) {
    return NextResponse.json(
      { ok: false, error: "Choose a valid marquee." },
      { status: 400 },
    );
  }
  if (typeof label !== "string" || label.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Enter the ticker text." },
      { status: 400 },
    );
  }

  const item = await createMarqueeItem(
    {
      placement: placement as "HOME_HERO" | "HOME_SHOWCASE" | "PDP",
      label,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    },
    { staffUserId: session.context.staffUserId },
  );
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
