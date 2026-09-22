import { adjustInventory } from "@onwei/core";
import type { InventoryAdjustmentReason } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../_lib/requireStaffSession";

const VALID_REASONS: InventoryAdjustmentReason[] = [
  "RESTOCK",
  "RETURN",
  "ADJUSTMENT",
];

export async function POST(request: Request) {
  const session = await requireStaffSession(request, "inventory:adjust");
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    productVariantId?: unknown;
    warehouseId?: unknown;
    delta?: unknown;
    reason?: unknown;
  } | null;

  const productVariantId =
    typeof body?.productVariantId === "string" ? body.productVariantId : "";
  const warehouseId =
    typeof body?.warehouseId === "string" ? body.warehouseId : "";
  const delta = typeof body?.delta === "number" ? body.delta : NaN;
  const reason = VALID_REASONS.includes(
    body?.reason as InventoryAdjustmentReason,
  )
    ? (body!.reason as InventoryAdjustmentReason)
    : null;

  if (
    !productVariantId ||
    !warehouseId ||
    Number.isNaN(delta) ||
    delta === 0 ||
    !reason
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Pick a variant and warehouse, enter a non-zero quantity change, and choose a reason.",
      },
      { status: 400 },
    );
  }

  try {
    const inventory = await adjustInventory(
      { productVariantId, warehouseId, delta, reason },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, inventory });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("negative")
        ? "That would take stock below zero — check the quantity and try again."
        : "Couldn't find that variant/warehouse combination.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
