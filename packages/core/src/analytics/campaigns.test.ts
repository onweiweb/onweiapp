import { describe, expect, it, vi } from "vitest";

const groupBy = vi.fn();
vi.mock("@onwei/database", () => ({
  prisma: { waitlistEntry: { groupBy: (...a: unknown[]) => groupBy(...a) } },
}));

import { listKnownCampaigns } from "./campaigns";

describe("listKnownCampaigns", () => {
  it("returns campaign names, skipping empty ones", async () => {
    groupBy.mockResolvedValue([
      { utmCampaign: "launch-week" },
      { utmCampaign: null },
      { utmCampaign: "teaser" },
    ]);
    expect(await listKnownCampaigns()).toEqual(["launch-week", "teaser"]);
    expect(groupBy.mock.calls[0]![0]).toMatchObject({ take: 20 });
  });
});
