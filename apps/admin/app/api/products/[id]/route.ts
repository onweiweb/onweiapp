import { deleteProduct, updateProduct } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { include: { inventory: { include: { warehouse: true } } } },
    },
  });

  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that product." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, product });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "product:update");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    slug?: unknown;
    categoryId?: unknown;
    description?: unknown;
    status?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  try {
    const product = await updateProduct(
      id,
      {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
        categoryId:
          typeof body.categoryId === "string" ? body.categoryId : undefined,
        description:
          typeof body.description === "string" || body.description === null
            ? body.description
            : undefined,
        status:
          body.status === "DRAFT" ||
          body.status === "ACTIVE" ||
          body.status === "ARCHIVED"
            ? body.status
            : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, product });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that product." },
      { status: 404 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "product:delete");
  if (!session.ok) return session.response;

  const { id } = await params;
  try {
    const product = await deleteProduct(id, {
      staffUserId: session.context.staffUserId,
    });
    return NextResponse.json({ ok: true, product });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that product." },
      { status: 404 },
    );
  }
}
