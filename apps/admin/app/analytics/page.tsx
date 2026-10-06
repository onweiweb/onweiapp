import Link from "next/link";
import {
  AnalyticsUnavailableError,
  PAGE_TYPES,
  getDeviceSplit,
  getEngagement,
  getFormFunnels,
  getLocations,
  getSourceBreakdown,
  getTopPages,
  getTrafficSummary,
  type AnalyticsRangeDays,
  type PageFilter,
} from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";
import { formatDuration, formatNumber, formatPercent } from "./_format";

const RANGES: { days: AnalyticsRangeDays; label: string }[] = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

function parseDays(value: string | undefined): AnalyticsRangeDays {
  return value === "30" ? 30 : value === "90" ? 90 : 7;
}

function parsePage(
  type: string | undefined,
  path: string | undefined,
): PageFilter {
  if (path?.startsWith("/")) return { kind: "path", value: path.slice(0, 200) };
  if (type && PAGE_TYPES.some((p) => p.value === type))
    return { kind: "pageType", value: type };
  return { kind: "all" };
}

function hrefFor(days: number, type?: string, path?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (type) params.set("type", type);
  if (path) params.set("path", path);
  return `/analytics?${params.toString()}`;
}

function Stat({
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

function Section({
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
      : "Couldn't load visitor numbers just now. Wait a minute and reload the page.";
  }
  return "Something went wrong loading visitor numbers. Reload the page, and if it keeps happening, tell the developer.";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; type?: string; path?: string }>;
}) {
  await requirePageSession("waitlist:view");
  const params = await searchParams;
  const days = parseDays(params.days);
  const page = parsePage(params.type, params.path);

  const ownHost = (() => {
    try {
      return process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
        : null;
    } catch {
      return null;
    }
  })();
  const opts = { days, page, ownHost };

  let data: Awaited<ReturnType<typeof loadAll>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await loadAll(opts);
  } catch (error) {
    errorMessage = unavailableMessage(error);
  }

  const activeType = page.kind === "pageType" ? page.value : undefined;

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold uppercase">
          Visitors and engagement
        </h1>
        <Link
          href="/analytics/links"
          className="rounded-[30px] border border-onwei-blue px-5 py-2 font-cta text-sm uppercase tracking-wide"
        >
          Make a tracked link
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <nav aria-label="Time range" className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={hrefFor(r.days, activeType)}
              aria-current={r.days === days ? "page" : undefined}
              className={`rounded-[30px] px-4 py-1.5 text-sm ${r.days === days ? "bg-onwei-blue text-onwei-beige" : "border border-onwei-blue/25"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Which pages" className="flex flex-wrap gap-2">
          {[{ value: undefined, label: "All pages" }, ...PAGE_TYPES].map(
            (p) => (
              <Link
                key={p.value ?? "all"}
                href={hrefFor(days, p.value)}
                aria-current={
                  page.kind !== "path" && p.value === activeType
                    ? "page"
                    : undefined
                }
                className={`rounded-[30px] px-4 py-1.5 text-sm ${page.kind !== "path" && p.value === activeType ? "bg-onwei-purple text-onwei-white" : "border border-onwei-blue/25"}`}
              >
                {p.label}
              </Link>
            ),
          )}
          {page.kind === "path" ? (
            <span className="rounded-[30px] bg-onwei-purple px-4 py-1.5 text-sm text-onwei-white">
              Only {page.value}
            </span>
          ) : null}
        </nav>
      </div>

      {errorMessage || !data ? (
        <AdminCard>
          <p>{errorMessage}</p>
        </AdminCard>
      ) : (
        <>
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
                <p className="mb-3 text-sm text-onwei-blue/70">
                  Page views each day
                </p>
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
          </Section>

          <Section
            title="Where visitors came from"
            help="Use a tracked link for each place you share the site so it shows up by name. Anything without one shows as Direct or unknown, which includes most WhatsApp shares. Signup rate is signups divided by visits."
          >
            {data.sources.length === 0 ? (
              <p className="text-onwei-blue/70">
                Nothing yet. Once people arrive, you&apos;ll see where they came
                from here.
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
                        <span className="text-right">
                          {formatPercent(n / total)}
                        </span>
                      </div>
                    ))}
                </AdminCard>
              );
            })()}
          </Section>

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
                      <AdminTableCell>
                        {formatNumber(p.visitors)}
                      </AdminTableCell>
                      <AdminTableCell>
                        {formatPercent(p.reachedHalfway)}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </Section>

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
                        <Bar
                          fraction={step.people / Math.max(form.started, 1)}
                        />
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
          </Section>
        </>
      )}
    </main>
  );
}

async function loadAll(opts: {
  days: AnalyticsRangeDays;
  page: PageFilter;
  ownHost: string | null;
}) {
  const [traffic, sources, devices, engagement, topPages, forms, locations] =
    await Promise.all([
      getTrafficSummary(opts),
      getSourceBreakdown(opts),
      getDeviceSplit(opts),
      getEngagement(opts),
      getTopPages(opts),
      getFormFunnels(opts),
      getLocations(opts),
    ]);
  return { traffic, sources, devices, engagement, topPages, forms, locations };
}
