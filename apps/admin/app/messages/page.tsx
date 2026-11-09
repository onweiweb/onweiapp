import { countNewContactMessages, listContactMessages } from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import {
  AdminBadge,
  AdminCard,
  AdminPager,
  AdminTabLinks,
  EmptyState,
  PageHeader,
} from "../_components/ui";
import { MessageStatusButton } from "./_components/MessageStatusButton";

const TABS = [
  { id: "new", label: "To reply" },
  { id: "replied", label: "Replied" },
  { id: "all", label: "All" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  await requirePageSession("customer:view");
  const params = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === params.tab)
    ? (params.tab as TabId)
    : "new";
  const page = parsePage(params.page);

  const [fetched, newCount] = await Promise.all([
    listContactMessages({
      status: tab === "new" ? "NEW" : tab === "replied" ? "REPLIED" : undefined,
      ...pageWindow(page),
    }),
    countNewContactMessages(),
  ]);
  const { rows, hasNext } = trimPage(fetched);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Messages"
        description="What people sent from the Contact Us page. Reply from your email (the alert email's Reply goes straight to them), then mark it replied here."
      />
      <AdminTabLinks
        basePath="/messages"
        active={tab}
        tabs={TABS.map((t) =>
          t.id === "new" && newCount > 0
            ? { id: t.id, label: `${t.label} (${newCount})` }
            : t,
        )}
      />
      {rows.length === 0 ? (
        <EmptyState
          title={
            tab === "new" ? "Nothing waiting for a reply" : "No messages here"
          }
          description="New messages from the Contact Us page show up here."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((m) => (
            <li key={m.id}>
              <AdminCard className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-onwei-blue">
                      {m.fullName}
                    </p>
                    <p className="text-sm text-onwei-blue/70">
                      <a className="underline" href={`mailto:${m.email}`}>
                        {m.email}
                      </a>
                      {m.phone ? (
                        <>
                          {" · "}
                          <a className="underline" href={`tel:${m.phone}`}>
                            {m.phone}
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AdminBadge
                      tone={m.status === "NEW" ? "pending" : "success"}
                    >
                      {m.status === "NEW" ? "To reply" : "Replied"}
                    </AdminBadge>
                    <span className="text-xs text-onwei-blue/60">
                      {m.createdAt.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-onwei-blue">
                  {m.message}
                </p>
                <div className="flex flex-wrap gap-2">
                  <MessageStatusButton id={m.id} status={m.status} />
                </div>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
      <AdminPager
        pathname="/messages"
        page={page}
        hasNext={hasNext}
        params={{ tab }}
      />
    </main>
  );
}
