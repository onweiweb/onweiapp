import { deleteArticle, updateArticle } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  try {
    const article = await updateArticle(
      id,
      {
        title: typeof body.title === "string" ? body.title : undefined,
        slug: typeof body.slug === "string" ? body.slug : undefined,
        excerpt:
          typeof body.excerpt === "string" || body.excerpt === null
            ? body.excerpt
            : undefined,
        bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : undefined,
        coverImageUrl:
          typeof body.coverImageUrl === "string" || body.coverImageUrl === null
            ? body.coverImageUrl
            : undefined,
        isPublished:
          typeof body.isPublished === "boolean" ? body.isPublished : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    await triggerCatalogRevalidate();
    return NextResponse.json({ ok: true, article });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that article." },
      { status: 404 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const { id } = await params;
  try {
    await deleteArticle(id, { staffUserId: session.context.staffUserId });
    await triggerCatalogRevalidate();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that article." },
      { status: 404 },
    );
  }
}
