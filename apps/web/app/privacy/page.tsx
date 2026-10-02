import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cachedGetLegalPage as getLegalPage } from "../../lib/cachedCatalog";
import { LegalPageView } from "@/_components/LegalPageView";

// Same reasoning as about/page.tsx: the chrome depends on siteMode, so the
// page needs a revalidate window to pick up an admin flipping it.
export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalPage("privacy");
  return {
    title: page?.title ?? "Privacy Policy",
    description: "Privacy Policy for Onwei.",
    alternates: { canonical: "/privacy" },
  };
}

export default async function LegalPage() {
  const page = await getLegalPage("privacy");
  if (!page) notFound();
  return <LegalPageView page={page} />;
}
