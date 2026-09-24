import { prisma } from "@onwei/database";
import { hasPermission } from "@onwei/auth";
import { requirePageSession } from "../_lib/requirePageSession";
import { AddNewsletterSubscriberForm } from "../_components/AddNewsletterSubscriberForm";
import {
  AdminBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

export default async function NewsletterPage() {
  const { permissions } = await requirePageSession("newsletter:view");
  const canManage = hasPermission(permissions, "newsletter:manage");

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
    take: 200,
  });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Newsletter
      </h1>

      {canManage ? <AddNewsletterSubscriberForm /> : null}

      {subscribers.length === 0 ? (
        <p className="text-onwei-blue/70">
          No subscribers yet — they&apos;ll show up here once someone signs up.
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
                <AdminTableCell>{subscriber.source ?? "—"}</AdminTableCell>
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
    </main>
  );
}
