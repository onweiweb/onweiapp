import {
  describeSource,
  firstNameOf,
  insiderAddressUrl,
  insiderShareMessage,
  listWaitlistEntries,
} from "@onwei/core";
import { webUrl } from "../api/insiders/_lib/insiderMail";
import { CopyAddressLink } from "./_copyLinks";
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
  const secret = process.env.INSIDER_LINK_SECRET;
  const site = webUrl();

  /** The member's private address link, or null when it can't be made. */
  function addressUrlFor(id: string): string | null {
    try {
      return insiderAddressUrl(id, site, secret);
    } catch {
      return null;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-onwei-blue/70">
        To send someone their address form yourself (for example on WhatsApp),
        use Copy link or Copy message in their row. Each copied link works for
        90 days and opens only that person&apos;s form. Whichever link they use,
        from the email, WhatsApp or one you sent, they see the same saved
        address and can change it until the card is posted.
      </p>
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
              <AdminTableHeaderCell>Address link</AdminTableHeaderCell>
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
                    <AddressLinkCell
                      url={entry.insiderCode ? addressUrlFor(entry.id) : null}
                      insiderCode={entry.insiderCode}
                      firstName={firstNameOf(entry.fullName)}
                      hasCardAddress={entry.hasCardAddress}
                    />
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

function AddressLinkCell({
  url,
  insiderCode,
  firstName,
  hasCardAddress,
}: {
  url: string | null;
  insiderCode: string | null;
  firstName: string;
  hasCardAddress: boolean;
}) {
  if (!insiderCode) {
    return (
      <span className="text-sm text-onwei-blue/50">Give them a code first</span>
    );
  }
  if (!url) {
    return (
      <span className="text-sm text-onwei-blue/50">
        Link not set up yet. Ask your developer to add the Insider link secret.
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <CopyAddressLink
        url={url}
        message={insiderShareMessage({
          firstName,
          insiderCode,
          addressUrl: url,
        })}
      />
      <span className="text-xs text-onwei-blue/60">
        {hasCardAddress ? "Address shared" : "No address yet"}
      </span>
    </div>
  );
}
