import { createArticle } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "content:manage");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    slug?: unknown;
    excerpt?: unknown;
    bodyHtml?: unknown;
    coverImageUrl?: unknown;
    isPublished?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml : "";
  if (!title || !slug) {
    return NextResponse.json(
      { ok: false, error: "Give the article a title and a URL slug." },
      { status: 400 },
    );
  }

  try {
    const article = await createArticle(
      {
        title,
        slug,
        excerpt: typeof body?.excerpt === "string" ? body.excerpt : null,
        bodyHtml,
        coverImageUrl:
          typeof body?.coverImageUrl === "string" ? body.coverImageUrl : null,
        isPublished:
          typeof body?.isPublished === "boolean" ? body.isPublished : false,
      },
      { staffUserId: session.context.staffUserId },
    );
    await triggerCatalogRevalidate();
    return NextResponse.json({ ok: true, article }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "That URL slug is already in use." },
      { status: 400 },
    );
  }
}
