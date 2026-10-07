import Link from "next/link";
import { UTM_CHANNELS, listKnownCampaigns } from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { UtmLinkBuilder } from "../../_components/UtmLinkBuilder";

const PAGES = [
  { value: "/ontheway", label: "Waitlist page" },
  { value: "/", label: "Homepage" },
  { value: "/collection/all", label: "Shop all" },
  { value: "/about", label: "About page" },
  { value: "/journal", label: "Journal" },
];

// Linking straight to one product is common for story and message shares.
async function getProductPages() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return products.map((p) => ({
    value: `/product/${p.slug}`,
    label: `Product: ${p.name}`,
  }));
}

export default async function UtmLinksPage() {
  await requirePageSession("waitlist:view");
  // Suggestions are a nicety, so a failure here must not break the page.
  const [productPages, campaigns] = await Promise.all([
    getProductPages().catch(() => []),
    listKnownCampaigns().catch(() => []),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href="/analytics" className="text-sm underline">
          Back to visitors and engagement
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold uppercase">
          Make a tracked link
        </h1>
        <p className="mt-1 max-w-xl text-sm text-onwei-blue/70">
          Use a tracked link everywhere you share the site, such as your
          Instagram bio, stories, LinkedIn or WhatsApp. Then the reports show
          exactly which one brought people in and how many signed up.
        </p>
      </div>
      <UtmLinkBuilder
        channels={UTM_CHANNELS.map(({ id, label }) => ({ id, label }))}
        pages={[...PAGES, ...productPages]}
        campaigns={campaigns}
      />
    </main>
  );
}
