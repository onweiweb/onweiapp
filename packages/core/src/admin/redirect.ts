import { prisma } from "@onwei/database";

/**
 * Points fromPath at toPath (301-equivalent, consumed page-level by
 * apps/web/app/product/[slug]/page.tsx and collection/[slug]/page.tsx on
 * their not-found path). If some other path was already redirecting TO
 * fromPath — a slug changed twice — that row gets repointed at toPath too,
 * so chains collapse instead of accumulating: a visitor never bounces
 * through more than one redirect.
 */
export async function upsertRedirect(
  fromPath: string,
  toPath: string,
): Promise<void> {
  if (fromPath === toPath) return;

  await prisma.redirect.upsert({
    where: { fromPath },
    create: { fromPath, toPath },
    update: { toPath },
  });

  await prisma.redirect.updateMany({
    where: { toPath: fromPath },
    data: { toPath },
  });
}
