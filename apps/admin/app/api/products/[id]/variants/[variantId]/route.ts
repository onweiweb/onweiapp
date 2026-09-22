import { updateProductVariant } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../../_lib/requireStaffSession";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const session = await requireStaffSession(request, "productVariant:update");
  if (!session.ok) return session.response;

  const { variantId } = await params;
  const body = (await request.json().catch(() => null)) as {
    sku?: unknown;
    attributes?: unknown;
    price?: unknown;
    compareAtPrice?: unknown;
    weightGrams?: unknown;
    status?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  try {
    const variant = await updateProductVariant(
      variantId,
      {
        sku: typeof body.sku === "string" ? body.sku.trim() : undefined,
        attributes:
          body.attributes && typeof body.attributes === "object"
            ? (body.attributes as Record<string, string>)
            : undefined,
        price: typeof body.price === "number" ? body.price : undefined,
        compareAtPrice:
          typeof body.compareAtPrice === "number" ||
          body.compareAtPrice === null
            ? body.compareAtPrice
            : undefined,
        weightGrams:
          typeof body.weightGrams === "number" || body.weightGrams === null
            ? body.weightGrams
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
    return NextResponse.json({ ok: true, variant });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't find that variant." },
      { status: 404 },
    );
  }
}
