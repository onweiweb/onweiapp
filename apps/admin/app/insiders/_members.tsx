import { describeSource, listWaitlistEntries } from "@onwei/core";
import {
  AdminBadge,
  AdminButton,
  AdminInput,
  AdminPager,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

/** Insiders > Members: everyone who has signed up (was the Waitlist page). */
export async function MembersTab({ page, q }: { page: number; q?: string }) {
  const { entries, hasNext, firstSerial, total } = await listWaitlistEntries({
    page,
    search: q,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex items-end gap-3">
          <input type="hidden" name="tab" value="members" />
          <label className="flex flex-col gap-1.5 text-sm">
            Search by name, email, phone or Insider code
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
        <div className="flex items-center gap-3">
          <p className="text-sm text-onwei-blue/70">
            {q ? `${total} matching` : `${total} in total`}
          </p>
          <a href="/api/waitlist/export">
            <AdminButton type="button" variant="secondary">
              Export as CSV
            </AdminButton>
          </a>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-onwei-blue/70">
          {q
            ? "No Insider matches that search."
            : "No Insiders yet. People show up here once they sign up."}
        </p>
      ) : (
        <>
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>No.</AdminTableHeaderCell>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Insider code</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email</AdminTableHeaderCell>
              <AdminTableHeaderCell>Phone</AdminTableHeaderCell>
              <AdminTableHeaderCell>Movement flex</AdminTableHeaderCell>
              <AdminTableHeaderCell>Came from</AdminTableHeaderCell>
              <AdminTableHeaderCell>Location</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {entries.map((entry, index) => (
                <AdminTableRow key={entry.id}>
                  <AdminTableCell>{firstSerial - index}</AdminTableCell>
                  <AdminTableCell>{entry.fullName}</AdminTableCell>
                  <AdminTableCell>
                    {entry.insiderCode ? (
                      <span className="font-mono font-semibold tracking-wider">
                        {entry.insiderCode}
                      </span>
                    ) : (
                      <span className="text-onwei-blue/50">Not yet</span>
                    )}
                    {entry.codeEmailedAt ? (
                      <span className="block text-xs text-onwei-blue/60">
                        Emailed
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>{entry.email}</AdminTableCell>
                  <AdminTableCell>{entry.phone}</AdminTableCell>
                  <AdminTableCell>{entry.movementFlex ?? "-"}</AdminTableCell>
                  <AdminTableCell>
                    {describeSource(entry)}
                    {entry.utmCampaign ? ` (${entry.utmCampaign})` : ""}
                    <span className="block text-xs text-onwei-blue/60">
                      {entry.source === "insiders_page"
                        ? "Signed up on the Insiders page"
                        : "Signed up on the waitlist page"}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>
                    {[entry.city, entry.country].filter(Boolean).join(", ") ||
                      "-"}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge
                      tone={entry.unsubscribedAt ? "problem" : "success"}
                    >
                      {entry.unsubscribedAt ? "Unsubscribed" : "Member"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    {entry.submittedAt.toLocaleDateString()}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        </>
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{ tab: "members", ...(q ? { q } : {}) }}
      />
    </div>
  );
}
