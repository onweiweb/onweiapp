import type { Metadata } from "next";
import { formatArticleDate } from "../../../lib/formatDate";
import Image from "@/_components/ScaledImage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BlogCard } from "@/_components/BlogCard";
import {
  cachedGetPublishedArticleBySlug as getPublishedArticleBySlug,
  cachedListPublishedArticles as listPublishedArticles,
} from "../../../lib/cachedCatalog";
import { buildArticleMetadata } from "../../../lib/seo/metadata";
import { JsonLd } from "../../../lib/seo/jsonLd";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from "../../../lib/seo/structuredData";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { WaitlistHeader } from "@/_components/WaitlistHeader";
import { WaitlistFooter } from "@/_components/WaitlistFooter";
import { getSiteSetting } from "@onwei/core";

// No Figma frame exists for this page yet, it's new infrastructure (see
// docs/OPEN_DECISIONS.md's SEO entry), not a designed screen, so this
// intentionally reuses the site's existing type/color tokens rather than
// inventing a new visual language. Replace with a Figma-driven layout once
// one exists, per root CLAUDE.md ground rule 8.
// Built once per article and refreshed every minute, like the other catalog
// pages. An article published after the build renders on its first visit.
export const revalidate = 60;

export async function generateStaticParams() {
  const articles = await listPublishedArticles(50);
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return {};
  return buildArticleMetadata(article);
}

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();
  const { siteMode, instagramUrl, youtubeUrl, spotifyUrl } =
    await getSiteSetting();
  const isWaitlistMode = siteMode === "WAITLIST";
  const morePosts = (await listPublishedArticles(4))
    .filter((post) => post.slug !== article.slug)
    .slice(0, 3);

  return (
    <main>
      <JsonLd data={buildArticleJsonLd(article)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: article.title, path: `/journal/${article.slug}` },
        ])}
      />
      {isWaitlistMode ? (
        <WaitlistHeader navHref="/ontheway" navLabel="Join the Movement" />
      ) : (
        <SiteHeader />
      )}

      <article className="flex flex-col items-center bg-onwei-white px-6 py-14 desk:px-14">
        <div className="flex w-full max-w-[47.5rem] flex-col gap-8">
          <Link
            href="/journal"
            className="group inline-flex w-fit items-center gap-2 rounded-[1.875rem] border border-onwei-blue px-4 py-2 font-grotesk text-[length:max(0.75rem,11px)] uppercase leading-none text-onwei-blue transition-colors hover:bg-onwei-blue hover:text-onwei-beige desk:px-5 desk:py-2.5"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <path d="M13 8H3m4-4L3 8l4 4" />
            </svg>
            All blogs
          </Link>
          {article.coverImageUrl ? (
            <div className="relative aspect-[416/280] w-full overflow-hidden rounded-[1.25rem] bg-[#d4d4d4]">
              <Image
                src={article.coverImageUrl}
                alt=""
                fill
                sizes="760px"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {article.publishedAt ? (
              <p className="font-grotesk text-[length:max(0.6875rem,11px)] font-light text-onwei-blue/70">
                {formatArticleDate(article.publishedAt)}
              </p>
            ) : null}
            <h1 className="font-display text-[2.25rem] font-bold uppercase leading-[0.95] text-onwei-blue desk:text-[3rem]">
              {article.title}
            </h1>
          </div>

          <div
            className="flex flex-col gap-4 font-grotesk text-[length:max(1rem,11px)] text-onwei-blue [&_a]:underline [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:uppercase [&_ul]:list-disc [&_ul]:pl-5"
            // Staff-authored via apps/admin's content:manage-gated editor,
            // same trust boundary as everything else in that CMS, not
            // user-submitted content.
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        </div>
      </article>

      {morePosts.length > 0 ? (
        <section className="flex flex-col items-center bg-onwei-white px-6 pb-14 desk:px-14 desk:pb-24">
          <div className="flex w-full max-w-[90rem] flex-col gap-8">
            <h2 className="font-display text-[1.75rem] font-bold uppercase leading-[0.95] text-onwei-blue desk:text-[2.25rem]">
              more from the playbook
            </h2>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 desk:grid-cols-3">
              {morePosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
