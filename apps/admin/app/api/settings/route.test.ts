// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSiteSetting = vi.fn();
vi.mock("@onwei/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onwei/core")>()),
  updateSiteSetting: (...args: unknown[]) => updateSiteSetting(...args),
}));
vi.mock("../_lib/requireStaffSession", () => ({
  requireStaffSession: async () => ({
    ok: true,
    context: { staffUserId: "staff-1", permissions: ["settings:manage"] },
  }),
}));

import { PATCH } from "./route";

function patch(body: unknown) {
  return PATCH(
    new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

describe("PATCH /api/settings", () => {
  beforeEach(() => {
    updateSiteSetting.mockReset();
    updateSiteSetting.mockResolvedValue({ siteMode: "LIVE" });
  });

  it("rejects a social link that is not a web address", async () => {
    const response = await patch({ instagramUrl: "javascript:alert(1)" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Enter a full web address starting with https://",
    });
    expect(updateSiteSetting).not.toHaveBeenCalled();
  });

  it("accepts https links and lets an empty string clear one", async () => {
    const response = await patch({
      instagramUrl: "https://instagram.com/onwei",
      youtubeUrl: "",
    });
    expect(response.status).toBe(200);
    expect(updateSiteSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        instagramUrl: "https://instagram.com/onwei",
        youtubeUrl: "",
      }),
      { staffUserId: "staff-1" },
    );
  });

  it("rejects an unknown site mode", async () => {
    const response = await patch({ siteMode: "CLOSED" });
    expect(response.status).toBe(400);
  });
});
