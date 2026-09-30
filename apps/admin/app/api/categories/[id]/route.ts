import { updateCategory } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "category:update");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    slug?: unknown;
    parentId?: unknown;
    imageUrl?: unknown;
    isActive?: unknown;
    sortOrder?: unknown;
    metaTitle?: unknown;
    metaDescription?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  try {
    const category = await updateCategory(
      id,
      {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
        parentId:
          typeof body.parentId === "string" || body.parentId === null
            ? body.parentId
            : undefined,
        imageUrl:
          typeof body.imageUrl === "string" || body.imageUrl === null
            ? body.imageUrl
            : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        metaTitle:
          typeof body.metaTitle === "string" || body.metaTitle === null
            ? body.metaTitle
            : undefined,
        metaDescription:
          typeof body.metaDescription === "string" ||
          body.metaDescription === null
            ? body.metaDescription
            : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    await triggerCatalogRevalidate();
    return NextResponse.json({ ok: true, category });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that category." },
      { status: 404 },
    );
  }
}
