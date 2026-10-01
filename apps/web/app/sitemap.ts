import type { MetadataRoute } from "next";
import { getSiteSetting } from "@onwei/core";
import {
  cachedListActiveCategories as listActiveCategories,
  cachedListAllActiveProductSlugsForSitemap as listAllActiveProductSlugsForSitemap,
} from "../lib/cachedCatalog";
import { SITE_URL } from "../lib/seo/siteUrl";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteMode } = await getSiteSetting();

  if (siteMode === "WAITLIST") {
    // Matches proxy.ts's own allowlist, /ontheway is the only route a
    // crawler can actually reach right now, nothing else exists to list.
    return [{ url: `${SITE_URL}/ontheway`, changeFrequency: "daily" }];
  }

  const [categories, products] = await Promise.all([
    listActiveCategories(),
    listAllActiveProductSlugsForSitemap(),
  ]);

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    ...categories.map((category) => ({
      url: `${SITE_URL}/collection/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
