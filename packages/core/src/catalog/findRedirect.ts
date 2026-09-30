import { prisma } from "@onwei/database";

/** Backs apps/web's product/[slug] and collection/[slug] not-found path —
 * see packages/core/src/admin/redirect.ts for where rows get written. */
export async function findRedirect(fromPath: string): Promise<string | null> {
  const row = await prisma.redirect.findUnique({ where: { fromPath } });
  return row?.toPath ?? null;
}
