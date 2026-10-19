import { ensureLegalPages } from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { LegalPagesEditor } from "../../_components/LegalPagesEditor";
import { AdminTabLinks, PageHeader } from "../../_components/ui";

const TABS = [
  { id: "privacy", label: "Privacy policy" },
  { id: "terms", label: "Terms and conditions" },
] as const;

export default async function LegalPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageSession("content:manage");
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.id === tab) ? tab! : "privacy";

  // Creates the starting Privacy and Terms text the first time, a no-op
  // after that, so the production database needs no separate seed step.
  await ensureLegalPages();
  const page = await prisma.legalPage.findUnique({
    where: { slug: active },
    select: {
      id: true,
      slug: true,
      title: true,
      intro: true,
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, heading: true, body: true, isActive: true },
      },
    },
  });

  return (
    <main className="flex flex-col gap-5">
      <PageHeader
        title="Legal pages"
        description="The Privacy Policy and Terms and Conditions pages linked from the footer. Edit, hide, reorder or add any point."
      />
      <AdminTabLinks basePath="/content/legal" tabs={TABS} active={active} />
      {page ? <LegalPagesEditor pages={[page]} /> : null}
    </main>
  );
}
