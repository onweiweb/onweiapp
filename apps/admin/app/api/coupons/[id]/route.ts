import { updateCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "coupon:update");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    description?: unknown;
    isActive?: unknown;
    usageLimit?: unknown;
    perCustomerLimit?: unknown;
    minOrderValue?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  try {
    const coupon = await updateCoupon(
      id,
      {
        code: typeof body.code === "string" ? body.code.trim() : undefined,
        description:
          typeof body.description === "string" || body.description === null
            ? body.description
            : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
        usageLimit:
          typeof body.usageLimit === "number" || body.usageLimit === null
            ? body.usageLimit
            : undefined,
        perCustomerLimit:
          typeof body.perCustomerLimit === "number" ||
          body.perCustomerLimit === null
            ? body.perCustomerLimit
            : undefined,
        minOrderValue:
          typeof body.minOrderValue === "number" || body.minOrderValue === null
            ? body.minOrderValue
            : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, coupon });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "That code is already in use — pick a different one."
        : "Couldn't find that coupon.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
