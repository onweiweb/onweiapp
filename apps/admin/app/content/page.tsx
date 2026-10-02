import { ensureLegalPages } from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { ValuePropsEditor } from "../_components/ValuePropsEditor";
import { InstagramPhotosEditor } from "../_components/InstagramPhotosEditor";
import { MarqueeItemsEditor } from "../_components/MarqueeItemsEditor";
import { ArticlesEditor } from "../_components/ArticlesEditor";
import { LegalPagesEditor } from "../_components/LegalPagesEditor";
import { AdminTabs } from "../_components/ui";

export default async function ContentPage() {
  await requirePageSession("content:manage");
  // Creates the starting Privacy and Terms text the first time, a no-op
  // after that, so the production database needs no separate seed step.
  await ensureLegalPages();

  const [valueProps, instagramPhotos, marqueeItems, articles, legalPages] =
    await Promise.all([
      prisma.valueProp.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.instagramPhoto.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.marqueeItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      // Unlike the other three content types, this one intentionally
      // includes drafts (isPublished: false), the admin needs to see and
      // manage unpublished articles here too, not just live ones.
      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          isPublished: true,
        },
      }),
      prisma.legalPage.findMany({
        orderBy: { slug: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          intro: true,
          sections: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, heading: true, body: true, isActive: true },
          },
        },
      }),
    ]);

  const marqueeByPlacement = {
    HOME_HERO: marqueeItems.filter((item) => item.placement === "HOME_HERO"),
    HOME_SHOWCASE: marqueeItems.filter(
      (item) => item.placement === "HOME_SHOWCASE",
    ),
    PDP: marqueeItems.filter((item) => item.placement === "PDP"),
  } as const;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Marketing content
      </h1>

      <AdminTabs
        tabs={[
          {
            id: "value-props",
            label: "Value props",
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-onwei-blue/70">
                  The three cards shown on the homepage and every product page.
                </p>
                <ValuePropsEditor items={valueProps} />
              </div>
            ),
          },
          {
            id: "instagram",
            label: "Instagram photos",
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-onwei-blue/70">
                  The photo strip shown on the homepage and every product page.
                </p>
                <InstagramPhotosEditor items={instagramPhotos} />
              </div>
            ),
          },
          {
            id: "marquee",
            label: "Marquee tickers",
            content: (
              <div className="flex flex-col gap-6">
                <p className="text-sm text-onwei-blue/70">
                  The scrolling text bars. The homepage has two, and each
                  product page has its own. Short taglines only (e.g.
                  &quot;Built for Indian courts&quot;), not customer reviews.
                  Those live under Reviews and Review placements instead.
                </p>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold uppercase">
                    Homepage hero
                  </h3>
                  <MarqueeItemsEditor
                    placement="HOME_HERO"
                    items={marqueeByPlacement.HOME_HERO}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold uppercase">
                    Homepage showcase
                  </h3>
                  <MarqueeItemsEditor
                    placement="HOME_SHOWCASE"
                    items={marqueeByPlacement.HOME_SHOWCASE}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold uppercase">
                    Product page
                  </h3>
                  <MarqueeItemsEditor
                    placement="PDP"
                    items={marqueeByPlacement.PDP}
                  />
                </div>
              </div>
            ),
          },
          {
            id: "articles",
            label: "Articles",
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-onwei-blue/70">
                  The homepage&apos;s &quot;From the Playbook&quot; section and
                  each article&apos;s own page. Drafts stay hidden from the
                  storefront until published.
                </p>
                <ArticlesEditor items={articles} />
              </div>
            ),
          },
          {
            id: "legal",
            label: "Legal pages",
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-onwei-blue/70">
                  The Privacy Policy and Terms and Conditions pages linked from
                  the footer. Edit, hide, reorder or add any point.
                </p>
                <LegalPagesEditor pages={legalPages} />
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
