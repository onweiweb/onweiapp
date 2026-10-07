import Link from "next/link";
import {
  UTM_CHANNELS,
  listKnownCampaigns,
  listTrackedLinks,
} from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { UtmLinkBuilder } from "../../_components/UtmLinkBuilder";
import { SavedLinkActions } from "../../_components/SavedLinkActions";
import {
  AdminPager,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../../_components/ui";
import { pageWindow, parsePage, trimPage } from "../../_lib/pagination";

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

export default async function UtmLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePageSession("waitlist:view");
  const page = parsePage((await searchParams).page);
  // Suggestions are a nicety, so a failure here must not break the page.
  const [productPages, campaigns, saved] = await Promise.all([
    getProductPages().catch(() => []),
    listKnownCampaigns().catch(() => []),
    listTrackedLinks(pageWindow(page)),
  ]);
  const { rows: links, hasNext } = trimPage(saved);
  const channelLabel = (id: string) =>
    UTM_CHANNELS.find((c) => c.id === id)?.label ?? id;

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

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold uppercase">
          Links you&apos;ve made
        </h2>
        {links.length === 0 && page === 1 ? (
          <p className="text-onwei-blue/70">
            Links you make will show up here, so you can copy them again later.
          </p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Made on</AdminTableHeaderCell>
              <AdminTableHeaderCell>Shared on</AdminTableHeaderCell>
              <AdminTableHeaderCell>Opens</AdminTableHeaderCell>
              <AdminTableHeaderCell>Campaign</AdminTableHeaderCell>
              <AdminTableHeaderCell>Extra label</AdminTableHeaderCell>
              <AdminTableHeaderCell>Made by</AdminTableHeaderCell>
              <AdminTableHeaderCell>
                <span className="sr-only">Actions</span>
              </AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {links.map((l) => (
                <AdminTableRow key={l.id}>
                  <AdminTableCell>
                    {l.createdAt.toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </AdminTableCell>
                  <AdminTableCell>{channelLabel(l.channelId)}</AdminTableCell>
                  <AdminTableCell>{l.pagePath}</AdminTableCell>
                  <AdminTableCell>{l.campaign}</AdminTableCell>
                  <AdminTableCell>{l.content ?? "-"}</AdminTableCell>
                  <AdminTableCell>{l.createdBy?.name ?? "-"}</AdminTableCell>
                  <AdminTableCell>
                    <SavedLinkActions id={l.id} url={l.url} />
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
        <AdminPager pathname="/analytics/links" page={page} hasNext={hasNext} />
      </section>
    </main>
  );
}
