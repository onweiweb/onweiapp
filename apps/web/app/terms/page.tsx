import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cachedGetLegalPage as getLegalPage } from "../../lib/cachedCatalog";
import { LegalPageView } from "@/_components/LegalPageView";

// Same reasoning as about/page.tsx: the chrome depends on siteMode, so the
// page needs a revalidate window to pick up an admin flipping it.
export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalPage("terms");
  return {
    title: page?.title ?? "Terms and Conditions",
    description: "Terms and Conditions for Onwei.",
    alternates: { canonical: "/terms" },
  };
}

export default async function LegalPage() {
  const page = await getLegalPage("terms");
  if (!page) notFound();
  return <LegalPageView page={page} />;
}
