import { beforeEach, describe, expect, it, vi } from "vitest";

const groupBy = vi.fn();
vi.mock("@onwei/database", () => ({
  prisma: { waitlistEntry: { groupBy: (...a: unknown[]) => groupBy(...a) } },
}));

import { AnalyticsUnavailableError } from "./posthogClient";
import {
  clearAnalyticsCache,
  getEngagement,
  getFormFunnels,
  getSourceBreakdown,
  getTrafficSummary,
} from "./queries";

const config = {
  host: "https://us.posthog.com",
  projectId: "1",
  personalApiKey: "k",
  environment: "production",
};

function mockFetch(...results: unknown[][][]) {
  const fn = vi.fn();
  for (const r of results) {
    fn.mockResolvedValueOnce({ ok: true, json: async () => ({ results: r }) });
  }
  return fn as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  clearAnalyticsCache();
  groupBy.mockReset();
});

describe("posthog queries", () => {
  it("throws NOT_CONFIGURED without keys", async () => {
    await expect(
      getTrafficSummary({ days: 7, config: null }),
    ).rejects.toMatchObject({ reason: "NOT_CONFIGURED" });
  });

  it("throws REQUEST_FAILED on a bad response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    await expect(
      getTrafficSummary({ days: 7, config, fetchImpl: fetchImpl as never }),
    ).rejects.toBeInstanceOf(AnalyticsUnavailableError);
  });

  it("sends the key, environment and page filter as values, not in the SQL", async () => {
    const fetchImpl = mockFetch([[10, 4]], [["2026-10-01", 10, 4]]);
    const out = await getTrafficSummary({
      days: 30,
      page: { kind: "pageType", value: "waitlist" },
      config,
      fetchImpl,
    });
    expect(out.totalViews).toBe(10);
    expect(out.uniqueVisitors).toBe(4);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://us.posthog.com/api/projects/1/query/");
    expect(init.headers.Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body);
    expect(body.query.values).toMatchObject({
      env: "production",
      page_type: "waitlist",
    });
    expect(body.query.query).not.toContain("waitlist");
  });

  it("caches repeat calls", async () => {
    const fetchImpl = mockFetch([[1, 1]], [], [[2, 2]], []);
    const opts = { days: 7 as const, config, fetchImpl };
    await getTrafficSummary(opts);
    await getTrafficSummary(opts);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("merges visits and signups by friendly source and campaign and computes the rate", async () => {
    groupBy.mockResolvedValue([
      {
        utmSource: "instagram",
        utmMedium: "bio",
        utmCampaign: "launch",
        referrerHost: null,
        _count: { _all: 2 },
      },
    ]);
    const fetchImpl = mockFetch([
      ["instagram", "bio", "launch", "", 10],
      ["instagram", "bio", "teaser", "", 4],
      [null, null, null, "l.instagram.com", 5],
      [null, null, null, "", 20],
    ]);
    const rows = await getSourceBreakdown({ days: 7, config, fetchImpl });
    const launch = rows.find((r) => r.campaign === "launch");
    expect(launch).toMatchObject({
      label: "Instagram bio link",
      visits: 10,
      signups: 2,
    });
    expect(launch!.signupRate).toBeCloseTo(0.2);
    expect(rows.find((r) => r.campaign === "teaser")).toMatchObject({
      label: "Instagram bio link",
      visits: 4,
      signups: 0,
    });
    expect(rows.find((r) => r.label === "Instagram")).toMatchObject({
      campaign: null,
      visits: 5,
    });
    expect(rows[0]!.label).toBe("Direct or unknown");
  });

  it("maps engagement numbers", async () => {
    const fetchImpl = mockFetch([[200, 80, 95.4, 2.34, 62, 3400]]);
    expect(await getEngagement({ days: 7, config, fetchImpl })).toEqual({
      visits: 200,
      bounceRate: 0.4,
      averageSeconds: 95,
      pagesPerVisit: 2.3,
      typicalScrollPercent: 62,
      typicalSecondsToFirstInteraction: 3.4,
    });
  });

  it("builds a form funnel and where people left", async () => {
    const fetchImpl = mockFetch([
      ["waitlist", "form_started", null, 0, 100],
      ["waitlist", "field_completed", "email", 1, 60],
      ["waitlist", "field_completed", "name", 0, 80],
      ["waitlist", "submit_attempt", null, 0, 40],
      ["waitlist", "submit_success", null, 0, 30],
      ["waitlist", "form_abandoned", "email", 0, 25],
      ["waitlist", "form_abandoned", "phone", 0, 10],
    ]);
    const [form] = await getFormFunnels({ days: 7, config, fetchImpl });
    expect(form!.steps.map((s) => s.label)).toEqual([
      "Started the form",
      "Filled in name",
      "Filled in email",
      "Pressed the button",
      "Joined",
    ]);
    expect(form!.leftAt[0]).toEqual({ field: "email", people: 25 });
  });
});
