import { prisma } from "@onwei/database";

export interface ProductSitemapEntry {
  slug: string;
  updatedAt: Date;
}

/**
 * Slug + updatedAt only, for apps/web/app/sitemap.ts — listAllActiveProducts
 * hydrates images/variants/inventory/reviews for the actual "Shop All" page,
 * which a sitemap has no use for and would be wasteful to pull on every
 * crawl.
 */
export async function listAllActiveProductSlugsForSitemap(): Promise<
  ProductSitemapEntry[]
> {
  return prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
}
