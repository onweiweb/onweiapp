import { prisma } from "@onwei/database";
import type { MarqueePlacement } from "@onwei/database";

/** One marquee ticker's text lines — Homepage has two (hero, showcase),
 * the PDP has its own. */
export async function listMarqueeItems(
  placement: MarqueePlacement,
): Promise<string[]> {
  const items = await prisma.marqueeItem.findMany({
    where: { placement, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return items.map((item) => item.label);
}
