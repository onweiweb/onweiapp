// Read-only PostHog query client for the admin dashboard. Server-only: it
// uses a personal API key that must never reach the browser. The storefront
// sends events with the separate public project key (see apps/web).

export type AnalyticsUnavailableReason = "NOT_CONFIGURED" | "REQUEST_FAILED";

export class AnalyticsUnavailableError extends Error {
  constructor(public readonly reason: AnalyticsUnavailableReason) {
    super(`Analytics unavailable: ${reason}`);
    this.name = "AnalyticsUnavailableError";
  }
}

export interface PosthogConfig {
  /** API host for reads, e.g. https://us.posthog.com (not the ingest host). */
  host: string;
  projectId: string;
  personalApiKey: string;
  /** Only events tagged with this environment are counted. */
  environment: string;
}

export function readPosthogConfig(
  env: Record<string, string | undefined> = process.env,
): PosthogConfig | null {
  const projectId = env.POSTHOG_PROJECT_ID?.trim();
  const personalApiKey = (
    env.POSTHOG_PERSONAL_API_KEY ?? env.POSTHOG_ALLACCESS_TOKEN
  )?.trim();
  if (!projectId || !personalApiKey) return null;
  return {
    host: (env.POSTHOG_HOST?.trim() || "https://us.posthog.com").replace(
      /\/+$/,
      "",
    ),
    projectId,
    personalApiKey,
    environment: env.POSTHOG_ENVIRONMENT?.trim() || "production",
  };
}

export type HogqlValue = string | number;
export type HogqlRow = (string | number | null)[];

export interface RunHogqlOptions {
  config?: PosthogConfig | null;
  fetchImpl?: typeof fetch;
}

/** Runs one HogQL query. `values` fill {placeholders}, never string-concatenate user input. */
export async function runHogql(
  query: string,
  values: Record<string, HogqlValue> = {},
  options: RunHogqlOptions = {},
): Promise<HogqlRow[]> {
  const config =
    options.config === undefined ? readPosthogConfig() : options.config;
  if (!config) throw new AnalyticsUnavailableError("NOT_CONFIGURED");
  const doFetch = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(
      `${config.host}/api/projects/${encodeURIComponent(config.projectId)}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.personalApiKey}`,
        },
        body: JSON.stringify({
          // Collapsed to one line: a multi-line copy of the form funnel query
          // silently dropped rows on PostHog's side, one line does not.
          query: {
            kind: "HogQLQuery",
            query: query.replace(/\s+/g, " ").trim(),
            values,
          },
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new AnalyticsUnavailableError("REQUEST_FAILED");
  }
  if (!response.ok) throw new AnalyticsUnavailableError("REQUEST_FAILED");

  const body = (await response.json().catch(() => null)) as {
    results?: HogqlRow[];
  } | null;
  if (!body || !Array.isArray(body.results)) {
    throw new AnalyticsUnavailableError("REQUEST_FAILED");
  }
  return body.results;
}
