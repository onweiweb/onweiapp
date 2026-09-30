import { prisma } from "@onwei/database";
import type { ArticleListItem } from "./types";

/** Backs the homepage's "From the Playbook" section — replaces the
 * previous hardcoded JOURNAL_ARTICLES placeholder. */
export async function listPublishedArticles(
  limit?: number,
): Promise<ArticleListItem[]> {
  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
    },
  });

  return articles;
}
