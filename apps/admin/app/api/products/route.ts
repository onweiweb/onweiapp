import { createProduct } from "@onwei/core";
import type { ProductSpecInput } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

function parseSpecs(value: unknown): ProductSpecInput[] | undefined {
  return Array.isArray(value) ? (value as ProductSpecInput[]) : undefined;
}

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
    specs?: unknown;
    whoThisIsFor?: unknown;
    careInstructions?: unknown;
    powerRating?: unknown;
    spinRating?: unknown;
    controlRating?: unknown;
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

  try {
    const product = await createProduct(
      {
        name,
        slug,
        categoryId,
        description:
          typeof body?.description === "string" ? body.description : null,
        status,
        specs: parseSpecs(body?.specs),
        whoThisIsFor:
          typeof body?.whoThisIsFor === "string" ? body.whoThisIsFor : null,
        careInstructions:
          typeof body?.careInstructions === "string"
            ? body.careInstructions
            : null,
        powerRating:
          typeof body?.powerRating === "number" ? body.powerRating : null,
        spinRating:
          typeof body?.spinRating === "number" ? body.spinRating : null,
        controlRating:
          typeof body?.controlRating === "number" ? body.controlRating : null,
      },
      { staffUserId: session.context.staffUserId },
    );

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("invalid-specs")
        ? error.message.replace("invalid-specs: ", "")
        : "Couldn't create that product.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
