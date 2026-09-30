import { prisma } from "@onwei/database";
import type { ArticleDetail } from "./types";

/** Backs apps/web's /journal/[slug] — an unpublished (or nonexistent) slug
 * returns null, same not-found contract as getActiveProductBySlug. */
export async function getPublishedArticleBySlug(
  slug: string,
): Promise<ArticleDetail | null> {
  const article = await prisma.article.findFirst({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      bodyHtml: true,
      updatedAt: true,
    },
  });

  return article;
}
