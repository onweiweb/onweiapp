import { listInventory } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../_lib/defineAdminRoute";

export const GET = defineAdminRoute(
  { permission: "inventory:view" },
  async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const inventory = await listInventory({ lowStockOnly });
    return NextResponse.json({ ok: true, inventory });
  },
);
