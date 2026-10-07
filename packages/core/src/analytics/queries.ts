import { prisma } from "@onwei/database";
import {
  readPosthogConfig,
  runHogql,
  type HogqlRow,
  type HogqlValue,
  type PosthogConfig,
} from "./posthogClient";
import { slugifyUtmValue } from "./attribution";
import { describeSource } from "./sourceLabels";

export type AnalyticsRangeDays = 7 | 30 | 90;

/** Which pages a report covers. */
export type PageFilter =
  | { kind: "all" }
  | { kind: "pageType"; value: string }
  | { kind: "path"; value: string };

export interface AnalyticsQueryOptions {
  days: AnalyticsRangeDays;
  page?: PageFilter;
  config?: PosthogConfig | null;
  fetchImpl?: typeof fetch;
  /** The storefront host, so visits from our own pages are not counted as a source. */
  ownHost?: string | null;
}

// Mirrors apps/web/lib/analytics/pageType.ts.
export const PAGE_TYPES: readonly { value: string; label: string }[] = [
  { value: "waitlist", label: "Waitlist page" },
  { value: "home", label: "Homepage" },
  { value: "collection", label: "Collection pages" },
  { value: "product", label: "Product pages" },
  { value: "about", label: "About page" },
  { value: "journal", label: "Journal" },
];

interface Scope {
  where: string;
  values: Record<string, HogqlValue>;
  run: (q: string, v?: Record<string, HogqlValue>) => Promise<HogqlRow[]>;
}

function scopeFor(opts: AnalyticsQueryOptions): Scope {
  const config = opts.config === undefined ? readPosthogConfig() : opts.config;
  const days = opts.days;
  const values: Record<string, HogqlValue> = {
    env: config?.environment ?? "production",
  };
  let where = `properties.environment = {env} AND timestamp >= now() - INTERVAL ${days} DAY`;
  const page = opts.page ?? { kind: "all" };
  if (page.kind === "pageType") {
    values.page_type = page.value;
    where += " AND properties.page_type = {page_type}";
  } else if (page.kind === "path") {
    values.path = page.value;
    where += " AND properties.$pathname = {path}";
  }
  return {
    where,
    values,
    run: (q, v = {}) =>
      runHogql(q, { ...values, ...v }, { config, fetchImpl: opts.fetchImpl }),
  };
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

// ---------------------------------------------------------------- traffic

export interface TrafficSummary {
  totalViews: number;
  uniqueVisitors: number;
  perDay: { day: string; views: number; visitors: number }[];
}

export function getTrafficSummary(
  opts: AnalyticsQueryOptions,
): Promise<TrafficSummary> {
  const s = scopeFor(opts);
  return (async () => {
    const [totals, perDay] = await Promise.all([
      s.run(
        `SELECT count() AS views, uniq(distinct_id) AS visitors
         FROM events WHERE event = '$pageview' AND ${s.where}`,
      ),
      s.run(
        `SELECT toString(toDate(toTimeZone(timestamp, 'Asia/Kolkata'))) AS day, count() AS views, uniq(distinct_id) AS visitors
         FROM events WHERE event = '$pageview' AND ${s.where}
         GROUP BY day ORDER BY day`,
      ),
    ]);
    return {
      totalViews: num(totals[0]?.[0]),
      uniqueVisitors: num(totals[0]?.[1]),
      perDay: perDay.map((r) => ({
        day: String(r[0]),
        views: num(r[1]),
        visitors: num(r[2]),
      })),
    };
  })();
}

// ---------------------------------------------------------------- sources

export interface SourceRow {
  label: string;
  /** The campaign name from the tracked link, or null when there is none. */
  campaign: string | null;
  visits: number;
  /** Null when a page filter is on: signups are not tied to a page. */
  signups: number | null;
  /** Signups divided by visits, 0 to 1. Null when signups is null. */
  signupRate: number | null;
}

interface RawSource {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerHost: string | null;
  count: number;
}

const KEY_SEPARATOR = "\u0000";

// Counts per (source label, campaign). A campaign only means something on a
// tracked link, so visits that arrived without a UTM source have none.
function mergeSources(
  raws: RawSource[],
  ownHost: string | null | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of raws) {
    // Signups are stored as slugs. Visits carry whatever was in the link, so
    // "Instagram" and "instagram" must land in the same row.
    const slug = (v: string | null) => (v ? slugifyUtmValue(v) || null : null);
    const utmSource = slug(r.utmSource);
    const label = describeSource({
      ...r,
      utmSource,
      utmMedium: slug(r.utmMedium),
      ownHost,
    });
    const campaign = utmSource ? (slug(r.utmCampaign) ?? "") : "";
    const key = `${label}${KEY_SEPARATOR}${campaign}`;
    out.set(key, (out.get(key) ?? 0) + r.count);
  }
  return out;
}

export function getSourceBreakdown(
  opts: AnalyticsQueryOptions,
): Promise<SourceRow[]> {
  const s = scopeFor(opts);
  return (async () => {
    const since = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000);
    // Signups are not tied to a page, so with a page filter on they would be
    // compared against only part of the visits.
    const signupsApply = (opts.page ?? { kind: "all" }).kind === "all";
    const [visitRows, signupGroups] = await Promise.all([
      s.run(
        `SELECT properties.ft_utm_source, properties.ft_utm_medium, properties.ft_utm_campaign,
                properties.ft_referrer_host, uniq(properties.visit_id) AS visits
         FROM events WHERE event = '$pageview' AND ${s.where}
         GROUP BY 1, 2, 3, 4`,
      ),
      signupsApply
        ? prisma.waitlistEntry.groupBy({
            by: ["utmSource", "utmMedium", "utmCampaign", "referrerHost"],
            where: { submittedAt: { gte: since } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const visits = mergeSources(
      visitRows.map((r) => ({
        utmSource: str(r[0]),
        utmMedium: str(r[1]),
        utmCampaign: str(r[2]),
        referrerHost: str(r[3]),
        count: num(r[4]),
      })),
      opts.ownHost,
    );
    const signups = mergeSources(
      signupGroups.map((g) => ({
        utmSource: g.utmSource,
        utmMedium: g.utmMedium,
        utmCampaign: g.utmCampaign,
        referrerHost: g.referrerHost,
        count: g._count._all,
      })),
      opts.ownHost,
    );

    const keys = new Set([...visits.keys(), ...signups.keys()]);
    return [...keys]
      .map((key) => {
        const [label = "", campaign = ""] = key.split(KEY_SEPARATOR);
        const v = visits.get(key) ?? 0;
        const su = signupsApply ? (signups.get(key) ?? 0) : null;
        return {
          label,
          campaign: campaign || null,
          visits: v,
          signups: su,
          signupRate: su === null ? null : v > 0 ? Math.min(su / v, 1) : 0,
        };
      })
      .sort(
        (a, b) => b.visits - a.visits || (b.signups ?? 0) - (a.signups ?? 0),
      );
  })();
}

// ----------------------------------------------------------------- device

export interface DeviceSplit {
  phone: number;
  tablet: number;
  computer: number;
  other: number;
}

export function getDeviceSplit(
  opts: AnalyticsQueryOptions,
): Promise<DeviceSplit> {
  const s = scopeFor(opts);
  return (async () => {
    const rows = await s.run(
      `SELECT properties.$device_type AS device, uniq(properties.visit_id) AS visits
       FROM events WHERE event = '$pageview' AND ${s.where}
       GROUP BY device`,
    );
    const split: DeviceSplit = { phone: 0, tablet: 0, computer: 0, other: 0 };
    for (const r of rows) {
      const device = String(r[0] ?? "").toLowerCase();
      const n = num(r[1]);
      if (device === "mobile") split.phone += n;
      else if (device === "tablet") split.tablet += n;
      else if (device === "desktop") split.computer += n;
      else split.other += n;
    }
    return split;
  })();
}

// ------------------------------------------------------------- engagement

export interface EngagementSummary {
  visits: number;
  /** Visits that looked at one page and never scrolled, tapped or typed. 0 to 1. */
  bounceRate: number;
  averageSeconds: number;
  pagesPerVisit: number;
  /** Typical (median) deepest point reached, percent of the page, 0 when unknown. */
  typicalScrollPercent: number;
  /** Typical (median) seconds from page load to the first tap, key press or scroll. */
  typicalSecondsToFirstInteraction: number;
}

export function getEngagement(
  opts: AnalyticsQueryOptions,
): Promise<EngagementSummary> {
  const s = scopeFor(opts);
  return (async () => {
    const rows = await s.run(
      `SELECT count() AS visits,
              countIf(pv <= 1 AND interactions = 0) AS bounced,
              avg(duration) AS avg_duration,
              avg(pv) AS pages,
              quantileIf(0.5)(max_scroll, max_scroll > 0) AS scroll_median,
              quantileIf(0.5)(first_ms, first_ms > 0) AS first_median
       FROM (
         SELECT properties.visit_id AS sid,
                countIf(event = '$pageview') AS pv,
                countIf(event = 'first_interaction') AS interactions,
                dateDiff('second', min(timestamp), max(timestamp)) AS duration,
                maxIf(toFloat(properties.depth), event = 'scroll_depth') AS max_scroll,
                minIf(toFloat(properties.ms), event = 'first_interaction') AS first_ms
         FROM events
         WHERE ${s.where} AND properties.visit_id != ''
         GROUP BY sid
       )`,
    );
    const r = rows[0] ?? [];
    const visits = num(r[0]);
    return {
      visits,
      bounceRate: visits > 0 ? num(r[1]) / visits : 0,
      averageSeconds: Math.round(num(r[2])),
      pagesPerVisit: Math.round(num(r[3]) * 10) / 10,
      typicalScrollPercent: Math.round(num(r[4])),
      typicalSecondsToFirstInteraction:
        Math.round((num(r[5]) / 1000) * 10) / 10,
    };
  })();
}

// -------------------------------------------------------------- top pages

export interface TopPageRow {
  path: string;
  views: number;
  visitors: number;
  /** Share of visits to this page that scrolled at least halfway, 0 to 1. */
  reachedHalfway: number;
}

export function getTopPages(
  opts: AnalyticsQueryOptions,
): Promise<TopPageRow[]> {
  const s = scopeFor(opts);
  return (async () => {
    const rows = await s.run(
      `SELECT properties.$pathname AS path,
              countIf(event = '$pageview') AS views,
              uniqIf(distinct_id, event = '$pageview') AS visitors,
              uniqIf(properties.visit_id, event = 'scroll_depth' AND toFloat(properties.depth) = 50) AS halfway,
              uniqIf(properties.visit_id, event = '$pageview') AS sessions
       FROM events
       WHERE event IN ('$pageview', 'scroll_depth') AND ${s.where}
       GROUP BY path ORDER BY views DESC LIMIT 10`,
    );
    return rows
      .filter((r) => str(r[0]))
      .map((r) => ({
        path: String(r[0]),
        views: num(r[1]),
        visitors: num(r[2]),
        reachedHalfway: num(r[4]) > 0 ? Math.min(num(r[3]) / num(r[4]), 1) : 0,
      }));
  })();
}

// ------------------------------------------------------------------ forms

export interface FormFunnelStep {
  label: string;
  people: number;
}

export interface FormFunnel {
  name: string;
  started: number;
  submitted: number;
  /** Steps in the order people go through them: started, each field, tried to send, sent. */
  steps: FormFunnelStep[];
  /** Where people who gave up last were, most common first. */
  leftAt: { field: string; people: number }[];
}

export function getFormFunnels(
  opts: AnalyticsQueryOptions,
): Promise<FormFunnel[]> {
  const s = scopeFor(opts);
  return (async () => {
    const rows = await s.run(
      `SELECT properties.form_name AS form,
              event,
              if(event = 'form_abandoned', properties.last_field, properties.field) AS field,
              min(toFloat(properties.field_index)) AS idx,
              uniq(properties.visit_id) AS people
       FROM events
       WHERE event IN ('form_started', 'field_completed', 'submit_attempt', 'submit_success', 'form_abandoned')
         AND properties.form_name != '' AND ${s.where}
         AND (event != 'form_abandoned' OR properties.visit_id NOT IN (
           SELECT properties.visit_id FROM events
           WHERE event = 'submit_success' AND ${s.where}))
       GROUP BY form, event, field`,
    );

    const byForm = new Map<
      string,
      {
        started: number;
        attempted: number;
        submitted: number;
        fields: { field: string; idx: number; people: number }[];
        left: { field: string; people: number }[];
      }
    >();
    for (const r of rows) {
      const form = str(r[0]);
      if (!form) continue;
      const f = byForm.get(form) ?? {
        started: 0,
        attempted: 0,
        submitted: 0,
        fields: [],
        left: [],
      };
      const event = String(r[1]);
      const field = str(r[2]);
      const people = num(r[4]);
      if (event === "form_started") f.started += people;
      else if (event === "submit_attempt") f.attempted += people;
      else if (event === "submit_success") f.submitted += people;
      else if (event === "field_completed" && field)
        f.fields.push({ field, idx: num(r[3]), people });
      else if (event === "form_abandoned" && field)
        f.left.push({ field, people });
      byForm.set(form, f);
    }

    return [...byForm.entries()].map(([name, f]) => ({
      name,
      started: f.started,
      submitted: f.submitted,
      steps: [
        { label: "Started the form", people: f.started },
        ...f.fields
          .sort((a, b) => a.idx - b.idx)
          .map((x) => ({ label: `Filled in ${x.field}`, people: x.people })),
        { label: "Pressed the button", people: f.attempted },
        { label: "Joined", people: f.submitted },
      ],
      leftAt: f.left.sort((a, b) => b.people - a.people),
    }));
  })();
}

// -------------------------------------------------------------- locations

export interface LocationRow {
  place: string;
  people: number;
}

export interface LocationSummary {
  /** Top places visitors browsed from, approximate (from their network). */
  visitors: LocationRow[];
  /** Top places people signed up from, approximate. Empty when a page filter is on. */
  signups: LocationRow[];
  /** True when signups are left out because a page filter is on. */
  signupsHidden: boolean;
}

export function getLocations(
  opts: AnalyticsQueryOptions,
): Promise<LocationSummary> {
  const s = scopeFor(opts);
  return (async () => {
    const since = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000);
    const signupsHidden = (opts.page ?? { kind: "all" }).kind !== "all";
    const [visitorRows, signupGroups] = await Promise.all([
      s.run(
        `SELECT properties.$geoip_city_name AS city, properties.$geoip_country_name AS country,
                uniq(distinct_id) AS people
         FROM events WHERE event = '$pageview' AND ${s.where}
         GROUP BY city, country ORDER BY people DESC LIMIT 10`,
      ),
      signupsHidden
        ? Promise.resolve([])
        : prisma.waitlistEntry.groupBy({
            by: ["city", "country"],
            where: { submittedAt: { gte: since } },
            _count: { _all: true },
            orderBy: { _count: { id: "desc" } },
            take: 10,
          }),
    ]);
    const place = (city: string | null, country: string | null) =>
      [city, country].filter(Boolean).join(", ") || "Unknown";
    return {
      visitors: visitorRows.map((r) => ({
        place: place(str(r[0]), str(r[1])),
        people: num(r[2]),
      })),
      signups: signupGroups.map((g) => ({
        place: place(g.city, g.country),
        people: g._count._all,
      })),
      signupsHidden,
    };
  })();
}
