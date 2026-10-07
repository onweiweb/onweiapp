import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag: (t: string) => updateTag(t) }));
const requirePageSession = vi.fn();
vi.mock("../_lib/requirePageSession", () => ({
  requirePageSession: (p: string) => requirePageSession(p),
}));
const check = vi.fn();
vi.mock("@onwei/core", () => ({
  checkAnalyticsRefreshRateLimit: (id: string) => check(id),
}));

import { refreshAnalytics } from "./_actions";

beforeEach(() => {
  updateTag.mockReset();
  check.mockReset();
  requirePageSession.mockReset().mockResolvedValue({ staffUserId: "s1" });
});

describe("refreshAnalytics", () => {
  it("needs the waitlist:view permission and clears the saved reports", async () => {
    check.mockResolvedValue({ allowed: true });
    expect(await refreshAnalytics()).toEqual({ ok: true });
    expect(requirePageSession).toHaveBeenCalledWith("waitlist:view");
    expect(check).toHaveBeenCalledWith("s1");
    expect(updateTag).toHaveBeenCalledWith("analytics");
  });

  it("leaves the saved reports alone when the staff member refreshes too often", async () => {
    check.mockResolvedValue({ allowed: false });
    const result = await refreshAnalytics();
    expect(result.ok).toBe(false);
    expect(updateTag).not.toHaveBeenCalled();
  });
});
