import Image from "@/_components/ScaledImage";
import Link from "next/link";
import type { ArticleListItem } from "@onwei/core";
import { formatArticleDate } from "../../lib/formatDate";

// Card used on the Blogs index and the "more posts" row. Same look as the
// homepage "From the Playbook" cards.
export function BlogCard({
  post,
  eager = false,
}: {
  post: ArticleListItem;
  // Set for cards inside a horizontally scrolling row, lazy loading never
  // fires for images off-screen to the right.
  eager?: boolean;
}) {
  return (
    <article className="flex flex-col gap-3">
      <Link
        href={`/journal/${post.slug}`}
        className="relative block aspect-[416/280] w-full overflow-hidden rounded-[1.25rem] bg-[#d4d4d4]"
        aria-label={post.title}
      >
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            loading={eager ? "eager" : undefined}
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </Link>
      <div className="flex flex-col items-start gap-6 text-onwei-blue">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-2">
            {post.publishedAt ? (
              <p className="font-grotesk text-[length:max(0.6875rem,11px)] font-light leading-[1.2143]">
                {formatArticleDate(post.publishedAt)}
              </p>
            ) : null}
            <p className="line-clamp-2 font-display text-[length:max(1.125rem,11px)] font-medium uppercase leading-[1.3] tracking-[0.0135rem]">
              {post.title}
            </p>
          </div>
          {post.excerpt ? (
            <p className="line-clamp-3 font-grotesk text-body">
              {post.excerpt}
            </p>
          ) : null}
        </div>
        <Link
          href={`/journal/${post.slug}`}
          className="font-display text-[length:max(1rem,11px)] capitalize leading-[1.3] tracking-[0.012rem] underline"
        >
          Read More
        </Link>
      </div>
    </article>
  );
}
