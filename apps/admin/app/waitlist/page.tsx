import { redirect } from "next/navigation";

// The Waitlist page is now Insiders > Members. Old links and bookmarks land
// there, keeping a search or page number.
export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q } = await searchParams;
  const params = new URLSearchParams({ tab: "members" });
  if (q) params.set("q", q);
  if (page) params.set("page", page);
  redirect(`/insiders?${params.toString()}`);
}
