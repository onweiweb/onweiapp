import { notFound } from "next/navigation";
import { hasPermission } from "@onwei/auth";
import { countNewsletterAudience, getNewsletterIssue } from "@onwei/core";
import { requirePageSession } from "../../_lib/requirePageSession";
import { PageHeader } from "../../_components/ui";
import { NewsletterEditor } from "./_editor";

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { permissions } = await requirePageSession("newsletter:view");
  const canManage = hasPermission(permissions, "newsletter:manage");
  const { id } = await params;
  const issue = id === "new" ? null : await getNewsletterIssue(id);
  if (id !== "new" && !issue) notFound();
  const audience = await countNewsletterAudience({
    id: issue?.id ?? null,
    includeUnconfirmed: issue?.includeUnconfirmed ?? false,
  });

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title={issue ? issue.subject : "Write a newsletter"}
        description="Write it, send yourself a test, then send it. People get it in batches; the free email plan allows 100 emails a day, so a long list goes out over a few days. Press Send again each day until it's done."
        back={{ href: "/newsletter", label: "Newsletter" }}
      />
      <NewsletterEditor
        canManage={canManage}
        issue={
          issue
            ? {
                id: issue.id,
                subject: issue.subject,
                preheader: issue.preheader,
                bodyHtml: issue.bodyHtml,
                includeUnconfirmed: issue.includeUnconfirmed,
                status: issue.status,
                sent: issue.sent,
                failed: issue.failed,
              }
            : null
        }
        remaining={audience.remaining}
        withoutOptIn={audience.withoutOptIn}
      />
    </main>
  );
}
