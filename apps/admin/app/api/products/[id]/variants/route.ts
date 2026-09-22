import { createProductVariant } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "productVariant:create");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    sku?: unknown;
    attributes?: unknown;
    price?: unknown;
    compareAtPrice?: unknown;
    weightGrams?: unknown;
    status?: unknown;
  } | null;

  const sku = typeof body?.sku === "string" ? body.sku.trim() : "";
  const price = typeof body?.price === "number" ? body.price : NaN;
  const attributes =
    body?.attributes && typeof body.attributes === "object"
      ? (body.attributes as Record<string, string>)
      : null;

  if (!sku || Number.isNaN(price) || !attributes) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Give the variant a SKU, a price, and its attributes (size, color, etc).",
      },
      { status: 400 },
    );
  }

  try {
    const variant = await createProductVariant(
      {
        productId: id,
        sku,
        attributes,
        price,
        compareAtPrice:
          typeof body?.compareAtPrice === "number" ? body.compareAtPrice : null,
        weightGrams:
          typeof body?.weightGrams === "number" ? body.weightGrams : null,
        status:
          body?.status === "DRAFT" ||
          body?.status === "ACTIVE" ||
          body?.status === "ARCHIVED"
            ? body.status
            : "ACTIVE",
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, variant }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "That SKU is already in use." },
      { status: 400 },
    );
  }
}
