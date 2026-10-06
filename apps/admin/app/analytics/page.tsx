import Link from "next/link";
import { Suspense } from "react";
import {
  PAGE_TYPES,
  type AnalyticsRangeDays,
  type PageFilter,
} from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import { hrefFor } from "./_links";
import {
  DevicesSection,
  EngagementSection,
  FormsSection,
  LocationsSection,
  SectionSkeleton,
  SourcesSection,
  TopPagesSection,
  VisitorsSection,
} from "./_sections";

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
  const scope = { days, page, ownHost };

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

      <Suspense fallback={<SectionSkeleton title="Visitors" />}>
        <VisitorsSection scope={scope} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Where visitors came from" />}>
        <SourcesSection scope={scope} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Phone or computer" />}>
        <DevicesSection scope={scope} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="How people use the site" />}>
        <EngagementSection scope={scope} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Most visited pages" />}>
        <TopPagesSection scope={scope} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Forms" />}>
        <FormsSection scope={scope} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Where people are" />}>
        <LocationsSection scope={scope} />
      </Suspense>
    </main>
  );
}
