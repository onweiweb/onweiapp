import { prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type {
  AuditActor,
  CreateArticleInput,
  UpdateArticleInput,
} from "./types";

export async function createArticle(
  input: CreateArticleInput,
  actor: AuditActor,
) {
  const isPublished = input.isPublished ?? false;
  const article = await prisma.article.create({
    data: {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyHtml: input.bodyHtml,
      coverImageUrl: input.coverImageUrl ?? null,
      isPublished,
      // First-published timestamp, not "currently published" — set once,
      // on the transition into published, same as updateArticle below.
      publishedAt: isPublished ? new Date() : null,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "article.create",
    entityType: "Article",
    entityId: article.id,
    afterState: article,
  });

  return article;
}

export async function updateArticle(
  id: string,
  input: UpdateArticleInput,
  actor: AuditActor,
) {
  const before = await prisma.article.findUniqueOrThrow({ where: { id } });

  // publishedAt is "first published at," not "currently published" — only
  // stamp it the moment isPublished actually flips false → true. Toggling
  // back off (a correction, a scheduling mistake) leaves it as-is rather
  // than clearing it, so re-publishing later doesn't read as brand new.
  const willPublish = input.isPublished === true && !before.isPublished;

  const article = await prisma.article.update({
    where: { id },
    data: {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      bodyHtml: input.bodyHtml,
      coverImageUrl: input.coverImageUrl,
      isPublished: input.isPublished,
      publishedAt: willPublish ? new Date() : undefined,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "article.update",
    entityType: "Article",
    entityId: article.id,
    beforeState: before,
    afterState: article,
  });

  return article;
}

/** Real delete, not soft — marketing/editorial content, same convention as
 * ValueProp/InstagramPhoto/MarqueeItem, not customer/order/audit data. */
export async function deleteArticle(id: string, actor: AuditActor) {
  const before = await prisma.article.findUniqueOrThrow({ where: { id } });
  await prisma.article.delete({ where: { id } });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "article.delete",
    entityType: "Article",
    entityId: id,
    beforeState: before,
  });
}
