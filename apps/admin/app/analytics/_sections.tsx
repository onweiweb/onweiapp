import Link from "next/link";
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
import type { ReportScope } from "./_data";
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

/** Shown while a report loads, so the page appears at once. */
export function SectionSkeleton({ title }: { title: string }) {
  return (
    <Section title={title}>
      <div
        aria-busy="true"
        aria-label={`Loading ${title}`}
        className="h-28 animate-pulse rounded-[30px] bg-onwei-blue/10"
      />
    </Section>
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

export async function VisitorsSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [traffic, engagement] = await Promise.all([
      report.traffic(scope),
      report.engagement(scope),
    ]);
    data = { traffic, engagement };
  } catch (error) {
    return <SectionError title="Visitors" error={error} />;
  }

  return (
    <Section title="Visitors">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Page views"
          value={formatNumber(data.traffic.totalViews)}
          hint="Every time a page was opened."
        />
        <Stat
          label="Different people"
          value={formatNumber(data.traffic.uniqueVisitors)}
          hint="Counted per day without cookies, so someone who comes back on another day counts again."
        />
        <Stat
          label="Visits"
          value={formatNumber(data.engagement.visits)}
          hint="One visit is one stay on the site."
        />
      </div>
      {data.traffic.perDay.length > 0 ? (
        <AdminCard>
          <p className="mb-3 text-sm text-onwei-blue/70">Page views each day</p>
          <div className="flex flex-col gap-1.5">
            {data.traffic.perDay.map((d) => (
              <div
                key={d.day}
                className="grid grid-cols-[6rem_1fr_4rem] items-center gap-3 text-sm"
              >
                <span>{d.day}</span>
                <Bar
                  fraction={
                    d.views /
                    Math.max(...data.traffic.perDay.map((x) => x.views))
                  }
                />
                <span className="text-right">{formatNumber(d.views)}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : (
        <p className="text-onwei-blue/70">
          No visits recorded in this time range yet. Numbers show up within a
          few minutes of someone opening the site.
        </p>
      )}
    </Section>
  );
}

export async function SourcesSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [sources] = await Promise.all([report.sources(scope)]);
    data = { sources };
  } catch (error) {
    return <SectionError title="Where visitors came from" error={error} />;
  }

  return (
    <Section
      title="Where visitors came from"
      help="Use a tracked link for each place you share the site so it shows up by name. Anything without one shows as Direct or unknown, which includes most WhatsApp shares. Signup rate is signups divided by visits."
    >
      {data.sources.length === 0 ? (
        <p className="text-onwei-blue/70">
          Nothing yet. Once people arrive, you&apos;ll see where they came from
          here.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Source</AdminTableHeaderCell>
            <AdminTableHeaderCell>Visits</AdminTableHeaderCell>
            <AdminTableHeaderCell>Signups</AdminTableHeaderCell>
            <AdminTableHeaderCell>Signup rate</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {data.sources.map((s) => (
              <AdminTableRow key={s.label}>
                <AdminTableCell>{s.label}</AdminTableCell>
                <AdminTableCell>{formatNumber(s.visits)}</AdminTableCell>
                <AdminTableCell>{formatNumber(s.signups)}</AdminTableCell>
                <AdminTableCell>
                  {s.visits > 0 ? formatPercent(s.signupRate) : "-"}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </Section>
  );
}

export async function DevicesSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [devices] = await Promise.all([report.devices(scope)]);
    data = { devices };
  } catch (error) {
    return <SectionError title="Phone or computer" error={error} />;
  }

  return (
    <Section title="Phone or computer">
      {(() => {
        const d = data.devices;
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
                  className="grid grid-cols-[6rem_1fr_6rem] items-center gap-3 text-sm"
                >
                  <span>{label}</span>
                  <Bar fraction={n / total} />
                  <span className="text-right">{formatPercent(n / total)}</span>
                </div>
              ))}
          </AdminCard>
        );
      })()}
    </Section>
  );
}

export async function EngagementSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [engagement] = await Promise.all([report.engagement(scope)]);
    data = { engagement };
  } catch (error) {
    return <SectionError title="How people use the site" error={error} />;
  }

  return (
    <Section
      title="How people use the site"
      help="A bounce is a visit that opened one page and did nothing else: no scrolling, tapping or typing."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Bounce rate"
          value={formatPercent(data.engagement.bounceRate)}
        />
        <Stat
          label="Average time on site"
          value={formatDuration(data.engagement.averageSeconds)}
        />
        <Stat
          label="Pages per visit"
          value={String(data.engagement.pagesPerVisit)}
        />
        <Stat
          label="How far people scroll"
          value={
            data.engagement.typicalScrollPercent
              ? `${data.engagement.typicalScrollPercent}%`
              : "-"
          }
          hint="The typical deepest point reached on a page."
        />
        <Stat
          label="Time to first move"
          value={
            data.engagement.typicalSecondsToFirstInteraction
              ? `${data.engagement.typicalSecondsToFirstInteraction}s`
              : "-"
          }
          hint="Typical wait before someone scrolls, taps or types."
        />
      </div>
    </Section>
  );
}

export async function TopPagesSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [topPages] = await Promise.all([report.topPages(scope)]);
    data = { topPages };
  } catch (error) {
    return <SectionError title="Most visited pages" error={error} />;
  }
  const { days } = scope;

  return (
    <Section title="Most visited pages">
      {data.topPages.length === 0 ? (
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
            {data.topPages.map((p) => (
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
      )}
    </Section>
  );
}

export async function FormsSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [forms] = await Promise.all([report.forms(scope)]);
    data = { forms };
  } catch (error) {
    return <SectionError title="Forms" error={error} />;
  }

  return (
    <Section
      title="Forms"
      help="How many people get through each step, and the field they were on when they gave up."
    >
      {data.forms.length === 0 ? (
        <p className="text-onwei-blue/70">
          No one has started a form in this time range.
        </p>
      ) : (
        data.forms.map((form) => (
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
                  className="grid grid-cols-[12rem_1fr_4rem] items-center gap-3 text-sm"
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
      )}
    </Section>
  );
}

export async function LocationsSection({ scope }: { scope: ReportScope }) {
  let data;
  try {
    const [locations] = await Promise.all([report.locations(scope)]);
    data = { locations };
  } catch (error) {
    return <SectionError title="Where people are" error={error} />;
  }

  return (
    <Section
      title="Where people are"
      help="Worked out from their internet connection, so it's approximate and sometimes wrong (VPNs, mobile networks)."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            ["Visitors", data.locations.visitors],
            ["Signups", data.locations.signups],
          ] as const
        ).map(([title, rows]) => (
          <AdminCard key={title}>
            <p className="mb-2 font-semibold">{title}</p>
            {rows.length === 0 ? (
              <p className="text-sm text-onwei-blue/70">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {rows.map((r) => (
                  <li key={r.place} className="flex justify-between gap-4">
                    <span>{r.place}</span>
                    <span>{formatNumber(r.people)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        ))}
      </div>
    </Section>
  );
}
