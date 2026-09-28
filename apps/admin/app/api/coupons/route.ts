import { createCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

// `startsAt`/`endsAt` arrive as ISO date strings (or null to clear them) --
// converted to Date here since createCoupon/updateCoupon's input type is
// `Date | null`, matching the Prisma column.
function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "coupon:create");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    description?: unknown;
    usageLimit?: unknown;
    perCustomerLimit?: unknown;
    minOrderValue?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
  } | null;

  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Enter a coupon code." },
      { status: 400 },
    );
  }

  try {
    const coupon = await createCoupon(
      {
        code,
        description:
          typeof body?.description === "string" ? body.description : null,
        usageLimit:
          typeof body?.usageLimit === "number" ? body.usageLimit : null,
        perCustomerLimit:
          typeof body?.perCustomerLimit === "number"
            ? body.perCustomerLimit
            : null,
        minOrderValue:
          typeof body?.minOrderValue === "number" ? body.minOrderValue : null,
        startsAt: parseOptionalDate(body?.startsAt) ?? null,
        endsAt: parseOptionalDate(body?.endsAt) ?? null,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, coupon }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "That code is already in use — pick a different one."
        : "Couldn't create that coupon.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
