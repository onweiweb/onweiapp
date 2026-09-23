import { createInstagramPhoto } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "Missing photo details." },
      { status: 400 },
    );
  }
  const { imageUrl, altText, sortOrder } = body as Record<string, unknown>;

  if (typeof imageUrl !== "string" || imageUrl.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Enter an image URL." },
      { status: 400 },
    );
  }

  const photo = await createInstagramPhoto(
    {
      imageUrl,
      altText:
        typeof altText === "string" && altText.length > 0 ? altText : null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    },
    { staffUserId: session.context.staffUserId },
  );
  return NextResponse.json({ ok: true, photo }, { status: 201 });
}
