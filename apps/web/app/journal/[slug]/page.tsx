import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cachedGetPublishedArticleBySlug as getPublishedArticleBySlug } from "../../../lib/cachedCatalog";
import { buildArticleMetadata } from "../../../lib/seo/metadata";
import { JsonLd } from "../../../lib/seo/jsonLd";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from "../../../lib/seo/structuredData";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";

// No Figma frame exists for this page yet, it's new infrastructure (see
// docs/OPEN_DECISIONS.md's SEO entry), not a designed screen, so this
// intentionally reuses the site's existing type/color tokens rather than
// inventing a new visual language. Replace with a Figma-driven layout once
// one exists, per root CLAUDE.md ground rule 8.
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

  return (
    <main>
      <JsonLd data={buildArticleJsonLd(article)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: article.title, path: `/journal/${article.slug}` },
        ])}
      />
      <SiteHeader />

      <article className="flex flex-col items-center bg-onwei-white px-6 py-14 sm:px-14">
        <div className="flex w-full max-w-[760px] flex-col gap-8">
          {article.coverImageUrl ? (
            <div className="relative aspect-[416/280] w-full overflow-hidden rounded-[20px] bg-[#d4d4d4]">
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
              <p className="font-grotesk text-[11px] font-light text-onwei-blue/70">
                {article.publishedAt.toLocaleDateString()}
              </p>
            ) : null}
            <h1 className="font-display text-[36px] font-bold uppercase leading-[0.95] text-onwei-blue sm:text-[48px]">
              {article.title}
            </h1>
          </div>

          <div
            className="flex flex-col gap-4 font-grotesk text-[16px] text-onwei-blue [&_a]:underline [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:uppercase [&_ul]:list-disc [&_ul]:pl-5"
            // Staff-authored via apps/admin's content:manage-gated editor,
            // same trust boundary as everything else in that CMS, not
            // user-submitted content.
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
