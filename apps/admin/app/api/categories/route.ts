import { createCategory } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

export async function GET(request: Request) {
  const session = await requireStaffSession(request);
  if (!session.ok) return session.response;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ ok: true, categories });
}

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "category:create");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    slug?: unknown;
    parentId?: unknown;
    imageUrl?: unknown;
    isActive?: unknown;
    sortOrder?: unknown;
  } | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!name || !slug) {
    return NextResponse.json(
      { ok: false, error: "Give the category a name and a URL slug." },
      { status: 400 },
    );
  }

  const category = await createCategory(
    {
      name,
      slug,
      parentId: typeof body?.parentId === "string" ? body.parentId : null,
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl : null,
      isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
    },
    { staffUserId: session.context.staffUserId },
  );

  return NextResponse.json({ ok: true, category }, { status: 201 });
}
