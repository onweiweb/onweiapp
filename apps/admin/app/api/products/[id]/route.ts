import { deleteProduct, updateProduct } from "@onwei/core";
import type { ProductSpecInput } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

function parseSpecs(value: unknown): ProductSpecInput[] | undefined {
  return Array.isArray(value) ? (value as ProductSpecInput[]) : undefined;
}

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
    specs?: unknown;
    whoThisIsFor?: unknown;
    careInstructions?: unknown;
    powerRating?: unknown;
    spinRating?: unknown;
    controlRating?: unknown;
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
        specs: parseSpecs(body.specs),
        whoThisIsFor:
          typeof body.whoThisIsFor === "string" || body.whoThisIsFor === null
            ? body.whoThisIsFor
            : undefined,
        careInstructions:
          typeof body.careInstructions === "string" ||
          body.careInstructions === null
            ? body.careInstructions
            : undefined,
        powerRating:
          typeof body.powerRating === "number" || body.powerRating === null
            ? body.powerRating
            : undefined,
        spinRating:
          typeof body.spinRating === "number" || body.spinRating === null
            ? body.spinRating
            : undefined,
        controlRating:
          typeof body.controlRating === "number" || body.controlRating === null
            ? body.controlRating
            : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("invalid-specs")
        ? error.message.replace("invalid-specs: ", "")
        : "Couldn't find that product.";
    const status =
      error instanceof Error && error.message.startsWith("invalid-specs")
        ? 400
        : 404;
    return NextResponse.json({ ok: false, error: message }, { status });
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
