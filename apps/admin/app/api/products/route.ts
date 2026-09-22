import { createProduct } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

export async function GET(request: Request) {
  const session = await requireStaffSession(request);
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = 25;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        variants: { include: { inventory: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);

  return NextResponse.json({
    ok: true,
    products,
    pagination: { page, pageSize, total },
  });
}

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "product:create");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    slug?: unknown;
    categoryId?: unknown;
    description?: unknown;
    status?: unknown;
  } | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const categoryId =
    typeof body?.categoryId === "string" ? body.categoryId : "";
  if (!name || !slug || !categoryId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Give the product a name, a URL slug, and a category.",
      },
      { status: 400 },
    );
  }

  const status =
    body?.status === "ACTIVE" || body?.status === "ARCHIVED"
      ? body.status
      : "DRAFT";

  const product = await createProduct(
    {
      name,
      slug,
      categoryId,
      description:
        typeof body?.description === "string" ? body.description : null,
      status,
    },
    { staffUserId: session.context.staffUserId },
  );

  return NextResponse.json({ ok: true, product }, { status: 201 });
}
