import {
  getInsiderJoinMode,
  JOIN_REASONS,
  listApplications,
} from "@onwei/core";
import { pageWindow, trimPage } from "../_lib/pagination";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPager,
  AdminSelect,
  EmptyState,
} from "../_components/ui";
import { applicationFiltersFrom } from "./_applicationFilters";
import { ApplicationsList, JoinModeSwitch } from "./_applicationsClient";

/**
 * Insiders > Applications (invite-only Insiders). People who applied wait
 * here; approving gives them a code and sends the welcome, rejecting keeps
 * the row so the same mobile can't apply again.
 */
export async function ApplicationsTab({
  canManage,
  page,
  params,
}: {
  canManage: boolean;
  page: number;
  params: Record<string, string | undefined>;
}) {
  const filters = applicationFiltersFrom(params);
  const [mode, { rows, total, waiting }] = await Promise.all([
    getInsiderJoinMode(),
    listApplications(filters, pageWindow(page)),
  ]);
  const { rows: shown, hasNext } = trimPage(rows);
  const query = new URLSearchParams(
    Object.entries({
      status: filters.status,
      activity: filters.activity,
      reason: filters.reason,
      from: filters.from,
      to: filters.to,
      q: filters.search,
    }).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();

  return (
    <div className="flex flex-col gap-6">
      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">
          How people join
        </h2>
        <JoinModeSwitch mode={mode} canManage={canManage} />
      </AdminCard>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tab" value="applications" />
        <label className="flex flex-col gap-1.5 text-sm">
          Show
          <AdminSelect name="status" defaultValue={filters.status}>
            <option value="APPLIED">Waiting ({waiting})</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </AdminSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Fitness activity
          <AdminInput
            name="activity"
            defaultValue={filters.activity}
            placeholder="e.g. pilates"
            className="w-40"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Why they want to join
          <AdminSelect name="reason" defaultValue={filters.reason ?? ""}>
            <option value="">Any reason</option>
            {JOIN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Applied from
          <AdminInput type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          to
          <AdminInput type="date" name="to" defaultValue={filters.to} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Name, email or phone
          <AdminInput
            type="search"
            name="q"
            defaultValue={filters.search}
            className="w-52"
          />
        </label>
        <AdminButton type="submit" variant="secondary">
          Filter
        </AdminButton>
        <a href={`/api/insiders/applications/export?${query}`}>
          <AdminButton type="button" variant="secondary">
            Export as CSV
          </AdminButton>
        </a>
      </form>

      <p className="text-sm text-onwei-blue/70">{total} matching</p>
      {shown.length === 0 ? (
        <EmptyState
          title={
            filters.status === "APPLIED"
              ? "No applications waiting"
              : "Nothing matches these filters"
          }
          description={
            mode === "OPEN"
              ? "Joining is open right now, so nobody needs to apply. Switch to invite or apply above when you're ready."
              : "New applications from the Insiders page show up here."
          }
        />
      ) : (
        <ApplicationsList
          canManage={canManage && filters.status === "APPLIED"}
          rows={shown.map((r) => ({
            ...r,
            submittedAt: r.submittedAt.toISOString(),
            reviewedAt: r.reviewedAt?.toISOString() ?? null,
          }))}
        />
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{
          tab: "applications",
          ...Object.fromEntries(new URLSearchParams(query)),
        }}
      />
    </div>
  );
}
