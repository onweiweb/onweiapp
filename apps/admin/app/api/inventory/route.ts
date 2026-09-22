import { listInventory } from "@onwei/core";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../_lib/requireStaffSession";

export async function GET(request: Request) {
  const session = await requireStaffSession(request, "inventory:view");
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const lowStockOnly = searchParams.get("lowStockOnly") === "true";

  const inventory = await listInventory({ lowStockOnly });
  return NextResponse.json({ ok: true, inventory });
}
