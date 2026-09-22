import { addDiscountRule } from "@onwei/core";
import type { DiscountType } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";

const VALID_TYPES: DiscountType[] = ["PERCENTAGE", "FLAT", "BUY_X_GET_Y"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "discountRule:create");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    type?: unknown;
    config?: unknown;
    priority?: unknown;
    stackable?: unknown;
  } | null;

  const type = VALID_TYPES.includes(body?.type as DiscountType)
    ? (body!.type as DiscountType)
    : null;
  const config =
    body?.config && typeof body.config === "object"
      ? (body.config as Record<string, unknown>)
      : null;

  if (!type || !config) {
    return NextResponse.json(
      { ok: false, error: "Pick a discount type and fill in its details." },
      { status: 400 },
    );
  }

  try {
    const rule = await addDiscountRule(
      id,
      {
        type,
        config,
        priority:
          typeof body?.priority === "number" ? body.priority : undefined,
        stackable:
          typeof body?.stackable === "boolean" ? body.stackable : undefined,
      },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, rule }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("invalid-config")
        ? error.message.replace("invalid-config: ", "")
        : "Couldn't add that rule.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
