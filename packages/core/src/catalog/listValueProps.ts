import { prisma } from "@onwei/database";
import type { ValuePropItem } from "./types";

/** Shared Homepage + PDP "value prop" cards (Figma reuses the same 3 cards,
 * different copy on each page) — one data layer, not a hardcoded const per
 * page. */
export async function listValueProps(): Promise<ValuePropItem[]> {
  const items = await prisma.valueProp.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return items.map((item) => ({
    illustration: item.illustrationUrl,
    width: item.width,
    height: item.height,
    title: item.title,
    body: item.body,
  }));
}
