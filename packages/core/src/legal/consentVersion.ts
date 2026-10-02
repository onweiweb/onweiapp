import { prisma } from "@onwei/database";

/**
 * The version string stored as proof of consent: the most recent edit date
 * (ISO, UTC) across the given legal pages. Privacy and Terms are
 * CMS-editable, so the version moves whenever staff publish a change and
 * each consent record points at the text the person actually saw.
 * Falls back to "unversioned" if the pages haven't been created yet.
 */
export async function getCurrentConsentVersion(
  slugs: string[],
): Promise<string> {
  const pages = await prisma.legalPage.findMany({
    where: { slug: { in: slugs } },
    select: { updatedAt: true },
  });
  if (pages.length === 0) return "unversioned";
  const latest = Math.max(...pages.map((page) => page.updatedAt.getTime()));
  return new Date(latest).toISOString();
}
