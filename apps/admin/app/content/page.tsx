import { redirect } from "next/navigation";

// Old address, kept so saved links and bookmarks still land somewhere useful.
export default async function ContentIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "legal") redirect("/content/legal");
  if (tab === "value-props" || tab === "instagram" || tab === "marquee") {
    redirect(`/content/homepage?tab=${tab}`);
  }
  redirect("/content/blog");
}
