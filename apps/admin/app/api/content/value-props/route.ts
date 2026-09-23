import { createValueProp } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "Missing value prop details." },
      { status: 400 },
    );
  }
  const { illustrationUrl, width, height, title, bodyText, sortOrder } =
    body as Record<string, unknown>;

  if (
    typeof illustrationUrl !== "string" ||
    illustrationUrl.length === 0 ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    typeof title !== "string" ||
    title.length === 0 ||
    typeof bodyText !== "string" ||
    bodyText.length === 0
  ) {
    return NextResponse.json(
      { ok: false, error: "Fill in the illustration, size, title, and body." },
      { status: 400 },
    );
  }

  const prop = await createValueProp(
    {
      illustrationUrl,
      width,
      height,
      title,
      body: bodyText,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    },
    { staffUserId: session.context.staffUserId },
  );
  return NextResponse.json({ ok: true, valueProp: prop }, { status: 201 });
}
