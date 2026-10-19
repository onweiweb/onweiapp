import { prisma } from "@onwei/database";
import type { ArticleListItem } from "./types";

export interface ArticlePage {
  items: ArticleListItem[];
  total: number;
  page: number;
  pageCount: number;
}

/** One page of the Blogs index, newest first. Asking for a page past the
 * end returns the last page instead of an empty list. */
export async function listPublishedArticlesPage(
  page: number,
  pageSize: number,
): Promise<ArticlePage> {
  const where = { isPublished: true };
  const total = await prisma.article.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);

  const items = await prisma.article.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
    },
  });

  return { items, total, page: safePage, pageCount };
}
