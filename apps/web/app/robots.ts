import type { MetadataRoute } from "next";
import { getSiteSetting } from "@onwei/core";
import { SITE_URL } from "../lib/seo/siteUrl";

// Cheap and shared with sitemap.ts's own branch, reads the same
// getSiteSetting() proxy.ts already calls (15s in-process cache), so this
// isn't a live DB query on every crawl.
export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { siteMode } = await getSiteSetting();

  if (siteMode === "WAITLIST") {
    // Nothing indexable exists yet behind proxy.ts's gate, tell crawlers
    // not to bother collecting 307s to /waitlist for every product/category
    // URL they've discovered or guessed at, rather than staying silent
    // about it.
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/", "/cart"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
