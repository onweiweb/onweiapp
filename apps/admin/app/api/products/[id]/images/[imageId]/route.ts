import { removeProductImage } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../../_lib/triggerCatalogRevalidate";

export const DELETE = defineAdminRoute<never, { id: string; imageId: string }>(
  { permission: "productImage:manage" },
  async ({ staff, params }) => {
    try {
      await removeProductImage(params.imageId, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that image." },
        { status: 404 },
      );
    }
  },
);
