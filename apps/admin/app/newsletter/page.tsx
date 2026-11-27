import Link from "next/link";
import { istDateOf, listNewsletterIssues } from "@onwei/core";
import { prisma } from "@onwei/database";
import { hasPermission } from "@onwei/auth";
import { requirePageSession } from "../_lib/requirePageSession";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import { AddNewsletterSubscriberForm } from "../_components/AddNewsletterSubscriberForm";
import {
  AdminBadge,
  AdminPager,
  AdminTabLinks,
  EmptyState,
  LinkButton,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  PageHeader,
} from "../_components/ui";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const { permissions } = await requirePageSession("newsletter:view");
  const canManage = hasPermission(permissions, "newsletter:manage");
  const params = await searchParams;
  const page = parsePage(params.page);
  const tab = params.tab === "subscribers" ? "subscribers" : "newsletters";

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Newsletter"
        description="Write and send newsletters to the people who signed up for emails. Every newsletter has an unsubscribe link."
        actions={
          canManage ? (
            <LinkButton href="/newsletter/new">Write a newsletter</LinkButton>
          ) : undefined
        }
      />
      <AdminTabLinks basePath="/newsletter" tabs={TABS} active={tab} />
      {tab === "newsletters" ? (
        <Newsletters page={page} />
      ) : (
        <Subscribers page={page} canManage={canManage} />
      )}
    </main>
  );
}

const TABS = [
  { id: "newsletters", label: "Newsletters" },
  { id: "subscribers", label: "Subscribers" },
] as const;

const STATUS = {
  DRAFT: { label: "Draft", tone: "pending" },
  SENDING: { label: "Sending", tone: "active" },
  SENT: { label: "Sent", tone: "success" },
} as const;

async function Newsletters({ page }: { page: number }) {
  const { rows, hasNext } = trimPage(
    await listNewsletterIssues(pageWindow(page)),
  );
  if (rows.length === 0 && page === 1) {
    return (
      <EmptyState
        title="No newsletters yet"
        description="Write one, send yourself a test, then send it to your subscribers."
      />
    );
  }
  return (
    <>
      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>Subject</AdminTableHeaderCell>
          <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          <AdminTableHeaderCell>Sent to</AdminTableHeaderCell>
          <AdminTableHeaderCell>Date</AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {rows.map((r) => (
            <AdminTableRow key={r.id}>
              <AdminTableCell>
                <Link
                  href={`/newsletter/${r.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {r.subject}
                </Link>
              </AdminTableCell>
              <AdminTableCell>
                <AdminBadge tone={STATUS[r.status].tone}>
                  {STATUS[r.status].label}
                </AdminBadge>
              </AdminTableCell>
              <AdminTableCell>
                {r.sent}
                {r.failed ? ` (${r.failed} failed)` : ""}
              </AdminTableCell>
              <AdminTableCell>
                {istDateOf(r.sentAt ?? r.createdAt)}
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
      <AdminPager
        pathname="/newsletter"
        page={page}
        hasNext={hasNext}
        params={{ tab: "newsletters" }}
      />
    </>
  );
}

async function Subscribers({
  page,
  canManage,
}: {
  page: number;
  canManage: boolean;
}) {
  const fetched = await prisma.newsletterSubscriber.findMany({
    orderBy: [{ subscribedAt: "desc" }, { id: "desc" }],
    ...pageWindow(page),
  });
  const { rows: subscribers, hasNext } = trimPage(fetched);

  return (
    <>
      {canManage ? <AddNewsletterSubscriberForm /> : null}

      {subscribers.length === 0 ? (
        <p className="text-onwei-blue/70">
          No subscribers yet, they&apos;ll show up here once someone signs up.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Email</AdminTableHeaderCell>
            <AdminTableHeaderCell>Source</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Subscribed</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {subscribers.map((subscriber) => (
              <AdminTableRow key={subscriber.id}>
                <AdminTableCell>{subscriber.email}</AdminTableCell>
                <AdminTableCell>{subscriber.source ?? "-"}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge
                    tone={subscriber.unsubscribedAt ? "problem" : "success"}
                  >
                    {subscriber.unsubscribedAt ? "Unsubscribed" : "Subscribed"}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  {subscriber.subscribedAt.toLocaleDateString()}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
      <AdminPager
        pathname="/newsletter"
        page={page}
        hasNext={hasNext}
        params={{ tab: "subscribers" }}
      />
    </>
  );
}
