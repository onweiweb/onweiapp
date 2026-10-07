import Link from "next/link";
import type { ReactNode } from "react";
import { AnalyticsUnavailableError } from "@onwei/core";
import {
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";
import * as report from "./_data";
import type { ReportScope, Timed } from "./_data";
import { formatDuration, formatNumber, formatPercent } from "./_format";
import { hrefFor } from "./_links";

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <AdminCard>
      <p className="text-sm text-onwei-blue/70">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-onwei-blue/70">{hint}</p> : null}
    </AdminCard>
  );
}

export function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold uppercase">
          {title}
        </h2>
        {help ? <p className="text-sm text-onwei-blue/70">{help}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Bar({ fraction }: { fraction: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-onwei-beige">
      <div
        className="h-2 rounded-full bg-onwei-purple"
        style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
      />
    </div>
  );
}

function unavailableMessage(error: unknown): string {
  if (error instanceof AnalyticsUnavailableError) {
    return error.reason === "NOT_CONFIGURED"
      ? "Visitor tracking isn't connected yet. Add the PostHog project ID and access key in the admin settings on Vercel, then reload this page."
      : "Couldn't load this just now. Wait a minute and reload the page.";
  }
  return "Something went wrong loading this. Reload the page, and if it keeps happening, tell the developer.";
}

function SectionError({ title, error }: { title: string; error: unknown }) {
  return (
    <Section title={title}>
      <AdminCard>
        <p>{unavailableMessage(error)}</p>
      </AdminCard>
    </Section>
  );
}

function fetchedAtLabel(at: number) {
  return new Date(at).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Loads one report and shows it, or a plain-language message if PostHog is
 * down, so one failing report never takes the rest of the page with it.
 */
async function ReportSection<T>({
  title,
  help,
  load,
  children,
}: {
  title: string;
  help?: string | ((fetchedAt: number) => string);
  load: () => Promise<Timed<T>>;
  children: (data: T) => ReactNode;
}) {
  let result: Timed<T>;
  try {
    result = await load();
  } catch (error) {
    return <SectionError title={title} error={error} />;
  }
  return (
    <Section
      title={title}
      help={typeof help === "function" ? help(result.fetchedAt) : help}
    >
      {children(result.data)}
    </Section>
  );
}

export function VisitorsSection({ scope }: { scope: ReportScope }) {
  return (
    <ReportSection
      title="Visitors"
      help={(at) => `Numbers fetched at ${fetchedAtLabel(at)}.`}
      load={async () => {
        const [traffic, engagement] = await Promise.all([
          report.traffic(scope),
          report.engagement(scope),
        ]);
        return {
          data: { traffic: traffic.data, engagement: engagement.data },
          fetchedAt: Math.min(traffic.fetchedAt, engagement.fetchedAt),
        };
      }}
    >
      {({ traffic, engagement }) => {
        const mostViews = Math.max(...traffic.perDay.map((x) => x.views), 1);
        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat
                label="Page views"
                value={formatNumber(traffic.totalViews)}
                hint="Every time a page was opened."
              />
              <Stat
                label="Different people"
                value={formatNumber(traffic.uniqueVisitors)}
                hint="Counted per day without cookies, so someone who comes back on another day counts again."
              />
              <Stat
                label="Visits"
                value={formatNumber(engagement.visits)}
                hint="One visit is one stay on the site."
              />
            </div>
            {traffic.perDay.length > 0 ? (
              <AdminCard>
                <p className="mb-3 text-sm text-onwei-blue/70">
                  Page views each day
                </p>
                <div className="flex flex-col gap-1.5">
                  {traffic.perDay.map((d) => (
                    <div
                      key={d.day}
                      className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[6rem_1fr_4rem]"
                    >
                      <span>{d.day}</span>
                      <Bar fraction={d.views / mostViews} />
                      <span className="text-right">
                        {formatNumber(d.views)}
                      </span>
                    </div>
                  ))}
                </div>
              </AdminCard>
            ) : (
              <p className="text-onwei-blue/70">
                No visits recorded in this time range yet. Numbers show up
                within a few minutes of someone opening the site.
              </p>
            )}
          </>
        );
      }}
    </ReportSection>
  );
}

export function SourcesSection({ scope }: { scope: ReportScope }) {
  return (
    <ReportSection
      title="Where visitors came from"
      help="Use a tracked link for each place you share the site so it shows up by name. Anything without one shows as Direct or unknown, which includes most WhatsApp shares. Signup rate is signups divided by visits."
      load={() => report.sources(scope)}
    >
      {(sources) => {
        if (sources.length === 0) {
          return (
            <p className="text-onwei-blue/70">
              Nothing yet. Once people arrive, you&apos;ll see where they came
              from here.
            </p>
          );
        }
        const signupsHidden = sources.every((s) => s.signups === null);
        return (
          <>
            {signupsHidden ? (
              <p className="text-sm text-onwei-blue/70">
                Signups aren&apos;t tied to a page, so they&apos;re hidden while
                one page is selected. Pick All pages to see them.
              </p>
            ) : null}
            <AdminTable>
              <AdminTableHead>
                <AdminTableHeaderCell>Source</AdminTableHeaderCell>
                <AdminTableHeaderCell>Campaign</AdminTableHeaderCell>
                <AdminTableHeaderCell>Visits</AdminTableHeaderCell>
                {signupsHidden ? null : (
                  <>
                    <AdminTableHeaderCell>Signups</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Signup rate</AdminTableHeaderCell>
                  </>
                )}
              </AdminTableHead>
              <tbody>
                {sources.map((s) => (
                  <AdminTableRow key={`${s.label}|${s.campaign ?? ""}`}>
                    <AdminTableCell>{s.label}</AdminTableCell>
                    <AdminTableCell>{s.campaign ?? "-"}</AdminTableCell>
                    <AdminTableCell>{formatNumber(s.visits)}</AdminTableCell>
                    {signupsHidden ? null : (
                      <>
                        <AdminTableCell>
                          {formatNumber(s.signups ?? 0)}
                        </AdminTableCell>
                        <AdminTableCell>
                          {s.visits > 0 && s.signupRate !== null
                            ? formatPercent(s.signupRate)
                            : "-"}
                        </AdminTableCell>
                      </>
                    )}
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          </>
        );
      }}
    </ReportSection>
  );
}

export function DevicesSection({ scope }: { scope: ReportScope }) {
  return (
    <ReportSection title="Phone or computer" load={() => report.devices(scope)}>
      {(d) => {
        const total = d.phone + d.tablet + d.computer + d.other;
        if (total === 0)
          return <p className="text-onwei-blue/70">No visits yet.</p>;
        return (
          <AdminCard className="flex flex-col gap-3">
            {(
              [
                ["Phone", d.phone],
                ["Tablet", d.tablet],
                ["Computer", d.computer],
                ["Other", d.other],
              ] as const
            )
              .filter(([, n]) => n > 0)
              .map(([label, n]) => (
                <div
                  key={label}
                  className="grid grid-cols-[5rem_1fr_3.5rem] items-center gap-3 text-sm sm:grid-cols-[6rem_1fr_6rem]"
                >
                  <span>{label}</span>
                  <Bar fraction={n / total} />
                  <span className="text-right">{formatPercent(n / total)}</span>
                </div>
              ))}
          </AdminCard>
        );
      }}
    </ReportSection>
  );
}

export function EngagementSection({ scope }: { scope: ReportScope }) {
  return (
    <ReportSection
      title="How people use the site"
      help="A bounce is a visit that opened one page and did nothing else: no scrolling, tapping or typing."
      load={() => report.engagement(scope)}
    >
      {(e) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Bounce rate" value={formatPercent(e.bounceRate)} />
          <Stat
            label="Average time on site"
            value={formatDuration(e.averageSeconds)}
          />
          <Stat label="Pages per visit" value={String(e.pagesPerVisit)} />
          <Stat
            label="How far people scroll"
            value={e.typicalScrollPercent ? `${e.typicalScrollPercent}%` : "-"}
            hint="The typical deepest point reached on a page."
          />
          <Stat
            label="Time to first move"
            value={
              e.typicalSecondsToFirstInteraction
                ? `${e.typicalSecondsToFirstInteraction}s`
                : "-"
            }
            hint="Typical wait before someone scrolls, taps or types."
          />
        </div>
      )}
    </ReportSection>
  );
}

export function TopPagesSection({ scope }: { scope: ReportScope }) {
  const { days } = scope;
  return (
    <ReportSection
      title="Most visited pages"
      load={() => report.topPages(scope)}
    >
      {(topPages) =>
        topPages.length === 0 ? (
          <p className="text-onwei-blue/70">No page views yet.</p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Page</AdminTableHeaderCell>
              <AdminTableHeaderCell>Views</AdminTableHeaderCell>
              <AdminTableHeaderCell>People</AdminTableHeaderCell>
              <AdminTableHeaderCell>Scrolled halfway</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {topPages.map((p) => (
                <AdminTableRow key={p.path}>
                  <AdminTableCell>
                    <Link
                      href={hrefFor(days, undefined, p.path)}
                      className="underline"
                    >
                      {p.path}
                    </Link>
                  </AdminTableCell>
                  <AdminTableCell>{formatNumber(p.views)}</AdminTableCell>
                  <AdminTableCell>{formatNumber(p.visitors)}</AdminTableCell>
                  <AdminTableCell>
                    {formatPercent(p.reachedHalfway)}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )
      }
    </ReportSection>
  );
}

export function FormsSection({ scope }: { scope: ReportScope }) {
  return (
    <ReportSection
      title="Forms"
      help="How many people get through each step, and the field they were on when they gave up."
      load={() => report.forms(scope)}
    >
      {(forms) =>
        forms.length === 0 ? (
          <p className="text-onwei-blue/70">
            No one has started a form in this time range.
          </p>
        ) : (
          forms.map((form) => (
            <AdminCard key={form.name} className="flex flex-col gap-4">
              <p className="font-semibold capitalize">
                {form.name} form
                <span className="ml-2 text-sm font-normal text-onwei-blue/70">
                  {formatNumber(form.started)} started,{" "}
                  {formatNumber(form.submitted)} finished
                </span>
              </p>
              <div className="flex flex-col gap-1.5">
                {form.steps.map((step) => (
                  <div
                    key={step.label}
                    className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_4rem]"
                  >
                    <span>{step.label}</span>
                    <Bar fraction={step.people / Math.max(form.started, 1)} />
                    <span className="text-right">
                      {formatNumber(step.people)}
                    </span>
                  </div>
                ))}
              </div>
              {form.leftAt.length > 0 ? (
                <div className="text-sm">
                  <p className="font-medium">
                    Where people gave up (last field they touched)
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {form.leftAt.map((l) => (
                      <li key={l.field}>
                        {l.field}: {formatNumber(l.people)}{" "}
                        {l.people === 1 ? "person" : "people"}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AdminCard>
          ))
        )
      }
    </ReportSection>
  );
}

export function LocationsSection({ scope }: { scope: ReportScope }) {
  return (
    <ReportSection
      title="Where people are"
      help="Worked out from their internet connection, so it's approximate and sometimes wrong (VPNs, mobile networks)."
      load={() => report.locations(scope)}
    >
      {(locations) => {
        const columns = [
          ["Visitors", locations.visitors],
          ...(locations.signupsHidden
            ? []
            : [["Signups", locations.signups] as const]),
        ] as const;
        return (
          <>
            {locations.signupsHidden ? (
              <p className="text-sm text-onwei-blue/70">
                Signup places aren&apos;t tied to a page, so they&apos;re hidden
                while one page is selected.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {columns.map(([title, rows]) => (
                <AdminCard key={title}>
                  <p className="mb-2 font-semibold">{title}</p>
                  {rows.length === 0 ? (
                    <p className="text-sm text-onwei-blue/70">Nothing yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                      {rows.map((r) => (
                        <li
                          key={r.place}
                          className="flex justify-between gap-4"
                        >
                          <span>{r.place}</span>
                          <span>{formatNumber(r.people)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>
              ))}
            </div>
          </>
        );
      }}
    </ReportSection>
  );
}
