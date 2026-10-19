import type { ArticleListItem } from "@onwei/core";
import { BlogCard } from "@/_components/BlogCard";
import { ScrollCarousel } from "@/_components/ScrollCarousel";
import { CtaLink } from "@/_components/CtaLink";

// "From the playbook" row on the waitlist page. Shown only when staff turn on
// "Show blog posts on the waitlist page" and at least one post is published.
// No Figma frame, approved in chat: same card style as the homepage row.
export function WaitlistBlogSection({
  articles,
}: {
  articles: ArticleListItem[];
}) {
  if (articles.length === 0) return null;

  return (
    <section className="flex w-full flex-col items-center px-3 py-14 desk:px-14 desk:py-24">
      <div className="flex w-full max-w-[90rem] flex-col gap-[3.125rem]">
        <div className="flex w-full flex-col items-center gap-6 desk:flex-row desk:items-end desk:justify-between">
          <p className="text-center font-display text-[2.5rem] font-bold uppercase leading-[0.9] text-onwei-blue desk:text-left desk:text-display-md">
            from the <br className="desk:hidden" />
            playbook
          </p>
          <CtaLink
            href="/journal"
            className="bg-onwei-blue text-onwei-beige max-desk:py-2.5"
          >
            view all blogs
          </CtaLink>
        </div>
        {/* Mobile: swipeable row, same as the homepage's. From desk up it
            is an even 3-column row. */}
        <ScrollCarousel
          gap="gap-6"
          className="desk:overflow-visible"
          trackClassName="hidden"
        >
          {articles.map((post) => (
            <div
              key={post.slug}
              className="w-[18.9167rem] shrink-0 desk:w-auto desk:flex-1 desk:shrink"
            >
              <BlogCard post={post} eager />
            </div>
          ))}
        </ScrollCarousel>
      </div>
    </section>
  );
}
