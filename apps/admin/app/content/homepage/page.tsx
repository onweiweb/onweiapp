import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { ValuePropsEditor } from "../../_components/ValuePropsEditor";
import { InstagramPhotosEditor } from "../../_components/InstagramPhotosEditor";
import { MarqueeItemsEditor } from "../../_components/MarqueeItemsEditor";
import { AdminTabLinks, PageHeader } from "../../_components/ui";

const TABS = [
  { id: "value-props", label: "Value props" },
  { id: "instagram", label: "Instagram photos" },
  { id: "marquee", label: "Marquee tickers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DESCRIPTIONS: Record<TabId, string> = {
  "value-props":
    "The three cards shown on the homepage and every product page.",
  instagram: "The photo strip shown on the homepage and every product page.",
  marquee:
    'The scrolling text bars. The homepage has two, and each product page has its own. Short taglines only (e.g. "Built for Indian courts"), not customer reviews. Those live under Reviews and Review placements instead.',
};

// Only the open tab loads its data, so the page stays quick.
export default async function HomepageSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageSession("content:manage");
  const { tab } = await searchParams;
  const active: TabId = TABS.some((t) => t.id === tab)
    ? (tab as TabId)
    : "value-props";

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Homepage sections"
        description="Cards, photos and tickers shown around the storefront."
      />
      <AdminTabLinks basePath="/content/homepage" tabs={TABS} active={active} />
      <p className="max-w-3xl text-sm text-onwei-blue/70">
        {DESCRIPTIONS[active]}
      </p>
      <TabBody tab={active} />
    </main>
  );
}

async function TabBody({ tab }: { tab: TabId }) {
  if (tab === "value-props") {
    const items = await prisma.valueProp.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return <ValuePropsEditor items={items} />;
  }

  if (tab === "instagram") {
    const items = await prisma.instagramPhoto.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return <InstagramPhotosEditor items={items} />;
  }

  const items = await prisma.marqueeItem.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const groups = [
    { placement: "HOME_HERO", title: "Homepage hero" },
    { placement: "HOME_SHOWCASE", title: "Homepage showcase" },
    { placement: "PDP", title: "Product page" },
  ] as const;
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {groups.map((group) => (
        <section key={group.placement} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase">{group.title}</h2>
          <MarqueeItemsEditor
            placement={group.placement}
            items={items.filter((item) => item.placement === group.placement)}
          />
        </section>
      ))}
    </div>
  );
}
