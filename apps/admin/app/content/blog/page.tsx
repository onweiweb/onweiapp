import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { ArticlesEditor } from "../../_components/ArticlesEditor";
import { PageHeader } from "../../_components/ui";

export default async function BlogPostsPage() {
  await requirePageSession("content:manage");

  // Unlike the other content types, this one intentionally includes drafts
  // (isPublished: false), staff need to manage unpublished posts too.
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      bodyHtml: true,
      coverImageUrl: true,
      isPublished: true,
    },
  });

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Blog posts"
        description="Posts show on the Blogs page, on each post's own page and in the homepage's From the Playbook row. Drafts stay hidden until you publish."
      />
      <ArticlesEditor items={articles} />
    </main>
  );
}
