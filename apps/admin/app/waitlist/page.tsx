import Link from "next/link";
import { listWaitlistEntries } from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminBadge,
  AdminButton,
  AdminInput,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; q?: string }>;
}) {
  await requirePageSession("waitlist:view");
  const { cursor, q } = await searchParams;

  const { entries, nextCursor } = await listWaitlistEntries({
    cursor,
    search: q,
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold uppercase">
          Waitlist
        </h1>
        <a href="/api/waitlist/export">
          <AdminButton type="button" variant="secondary">
            Export as CSV
          </AdminButton>
        </a>
      </div>

      <form method="get" className="flex items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          Search by name, email, or phone
          <AdminInput
            type="search"
            name="q"
            defaultValue={q}
            placeholder="e.g. priya@example.com"
            className="w-72"
          />
        </label>
        <AdminButton type="submit" variant="secondary">
          Search
        </AdminButton>
      </form>

      {entries.length === 0 ? (
        <p className="text-onwei-blue/70">
          {q
            ? "No one on the waitlist matches that search."
            : "No one has joined the waitlist yet — they'll show up here once someone signs up."}
        </p>
      ) : (
        <>
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email</AdminTableHeaderCell>
              <AdminTableHeaderCell>Phone</AdminTableHeaderCell>
              <AdminTableHeaderCell>Movement flex</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {entries.map((entry) => (
                <AdminTableRow key={entry.id}>
                  <AdminTableCell>{entry.fullName}</AdminTableCell>
                  <AdminTableCell>{entry.email}</AdminTableCell>
                  <AdminTableCell>{entry.phone}</AdminTableCell>
                  <AdminTableCell>{entry.movementFlex ?? "—"}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge
                      tone={entry.unsubscribedAt ? "problem" : "success"}
                    >
                      {entry.unsubscribedAt ? "Unsubscribed" : "On the list"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    {entry.submittedAt.toLocaleDateString()}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>

          {nextCursor ? (
            <Link
              href={{
                pathname: "/waitlist",
                query: { cursor: nextCursor, ...(q ? { q } : {}) },
              }}
            >
              <AdminButton type="button" variant="secondary">
                Load more
              </AdminButton>
            </Link>
          ) : null}
        </>
      )}
    </main>
  );
}
