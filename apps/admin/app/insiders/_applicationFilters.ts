import type { ApplicationFilters } from "@onwei/core";

const STATUSES = ["APPLIED", "APPROVED", "REJECTED"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the Applications filters from the page's query string. */
export function applicationFiltersFrom(
  params: Record<string, string | undefined>,
): ApplicationFilters {
  const status = STATUSES.find((s) => s === params.status);
  return {
    status: status ?? "APPLIED",
    activity: params.activity?.trim().slice(0, 60) || undefined,
    reason: params.reason?.slice(0, 80) || undefined,
    from: params.from && DATE.test(params.from) ? params.from : undefined,
    to: params.to && DATE.test(params.to) ? params.to : undefined,
    search: params.q?.trim().slice(0, 80) || undefined,
  };
}
