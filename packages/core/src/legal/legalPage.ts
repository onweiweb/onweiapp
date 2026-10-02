import { prisma } from "@onwei/database";
import { DEFAULT_LEGAL_PAGES } from "./defaultLegalContent";

export interface LegalPageView {
  slug: string;
  title: string;
  intro: string | null;
  updatedAt: Date;
  sections: { id: string; heading: string; body: string }[];
}

/** Backs apps/web's /privacy and /terms. Only visible sections, in order.
 * Returns null when the page hasn't been created yet. */
export async function getLegalPage(
  slug: string,
): Promise<LegalPageView | null> {
  const page = await prisma.legalPage.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      intro: true,
      updatedAt: true,
      sections: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, heading: true, body: true },
      },
    },
  });
  return page;
}

/** Creates the starting Privacy and Terms pages if they don't exist yet.
 * Safe to run any number of times and never touches a page staff have
 * already created or edited. */
export async function ensureLegalPages(): Promise<void> {
  for (const page of DEFAULT_LEGAL_PAGES) {
    const existing = await prisma.legalPage.findUnique({
      where: { slug: page.slug },
      select: { id: true },
    });
    if (existing) continue;
    try {
      await prisma.legalPage.create({
        data: {
          slug: page.slug,
          title: page.title,
          intro: page.intro,
          sections: {
            create: page.sections.map((section, index) => ({
              heading: section.heading,
              body: section.body,
              sortOrder: index,
            })),
          },
        },
      });
    } catch {
      // Another request created it first (slug is unique), nothing to do.
    }
  }
}
