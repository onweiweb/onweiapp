import { prisma } from "@onwei/database";
import type { CategorySummary } from "./types";

export async function listActiveCategories(): Promise<CategorySummary[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
  }));
}
