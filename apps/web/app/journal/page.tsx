import type { Metadata } from "next";
import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { BlogCard } from "@/_components/BlogCard";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { WaitlistHeader } from "@/_components/WaitlistHeader";
import { WaitlistFooter } from "@/_components/WaitlistFooter";
import { getSiteSetting } from "@onwei/core";
import { CtaLink } from "@/_components/CtaLink";
import { TrackedLink } from "@/_components/TrackedLink";
import { cachedListPublishedArticlesPage as listPublishedArticlesPage } from "../../lib/cachedCatalog";
import { formatArticleDate } from "../../lib/formatDate";
import { JsonLd } from "../../lib/seo/jsonLd";
import { buildBreadcrumbJsonLd } from "../../lib/seo/structuredData";

// No Figma frame exists for the Blogs index. Approved layout (2026-10-19):
// a standard blog index built from the site's existing tokens and the
// homepage "From the Playbook" card style. Replace once a frame exists.
const PAGE_SIZE = 9;

export const metadata: Metadata = {
  title: "Blogs",
  description:
    "Stories, guides and training notes from the Onwei playbook for everyday movers.",
  alternates: { canonical: "/journal" },
};

function pageHref(page: number) {
  return page <= 1 ? "/journal" : `/journal?page=${page}`;
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const { siteMode, instagramUrl, youtubeUrl, spotifyUrl } =
    await getSiteSetting();
  const isWaitlistMode = siteMode === "WAITLIST";
  const requested = Number.parseInt(pageParam ?? "1", 10);
  const { items, page, pageCount } = await listPublishedArticlesPage(
    Number.isFinite(requested) ? requested : 1,
    PAGE_SIZE,
  );

  // The newest post gets the large feature row on the first page only.
  const featured = page === 1 ? items[0] : undefined;
  const grid = page === 1 ? items.slice(1) : items;

  return (
    <main>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blogs", path: "/journal" },
        ])}
      />
      {isWaitlistMode ? (
        <WaitlistHeader navHref="/ontheway" navLabel="Join the Movement" />
      ) : (
        <SiteHeader />
      )}

      <section className="flex flex-col items-center bg-onwei-white px-3 py-14 desk:px-14 desk:py-24">
        <div className="flex w-full max-w-[90rem] flex-col gap-[3.125rem]">
          <div className="flex flex-col gap-3 text-onwei-blue">
            <h1 className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] desk:text-display-md">
              the playbook
            </h1>
            <p className="max-w-[36rem] font-grotesk text-body">
              Stories, guides and training notes for everyday movers.
            </p>
          </div>

          {items.length === 0 ? (
            <p className="font-grotesk text-body text-onwei-blue">
              No posts yet. Check back soon.
            </p>
          ) : null}

          {featured ? (
            <article className="grid gap-6 desk:grid-cols-2 desk:items-center desk:gap-12">
              <TrackedLink
                href={`/journal/${featured.slug}`}
                analytics={{
                  event: "blog_card_clicked",
                  props: { post_slug: featured.slug, source: "journal" },
                }}
                aria-label={featured.title}
                className="relative block aspect-[416/280] w-full overflow-hidden rounded-[1.25rem] bg-[#d4d4d4]"
              >
                {featured.coverImageUrl ? (
                  <Image
                    src={featured.coverImageUrl}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </TrackedLink>
              <div className="flex flex-col items-start gap-6 text-onwei-blue">
                <div className="flex flex-col gap-3">
                  {featured.publishedAt ? (
                    <p className="font-grotesk text-[length:max(0.6875rem,11px)] font-light">
                      {formatArticleDate(featured.publishedAt)}
                    </p>
                  ) : null}
                  <h2 className="font-display text-[2rem] font-bold uppercase leading-[0.95] desk:text-[2.75rem]">
                    {featured.title}
                  </h2>
                  {featured.excerpt ? (
                    <p className="font-grotesk text-body">{featured.excerpt}</p>
                  ) : null}
                </div>
                <CtaLink
                  href={`/journal/${featured.slug}`}
                  analytics={{
                    event: "blog_card_clicked",
                    props: { post_slug: featured.slug, source: "journal" },
                  }}
                  className="bg-onwei-blue text-onwei-beige"
                >
                  read post
                </CtaLink>
              </div>
            </article>
          ) : null}

          {grid.length > 0 ? (
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 desk:grid-cols-3">
              {grid.map((post) => (
                <BlogCard key={post.slug} post={post} source="journal" />
              ))}
            </div>
          ) : null}

          {pageCount > 1 ? (
            <nav
              aria-label="Blog pages"
              className="flex items-center justify-center gap-6 font-display text-[length:max(1rem,11px)] uppercase text-onwei-blue"
            >
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="underline">
                  Newer
                </Link>
              ) : null}
              <span>
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Link href={pageHref(page + 1)} className="underline">
                  Older
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>

      {isWaitlistMode ? (
        <WaitlistFooter
          instagramUrl={instagramUrl}
          youtubeUrl={youtubeUrl}
          spotifyUrl={spotifyUrl}
        />
      ) : (
        <SiteFooter />
      )}
    </main>
  );
}
