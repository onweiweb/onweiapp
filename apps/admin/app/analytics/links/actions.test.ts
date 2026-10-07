import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePageSession = vi.fn();
vi.mock("../../_lib/requirePageSession", () => ({
  requirePageSession: (p: string) => requirePageSession(p),
}));

import { buildLinkAction } from "./actions";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

beforeEach(() => {
  requirePageSession.mockReset().mockResolvedValue({ staffUserId: "s1" });
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.onwei.in");
});

describe("buildLinkAction", () => {
  it("returns a tagged link and checks the permission", async () => {
    const state = await buildLinkAction(
      { status: "idle" },
      form({
        page: "/ontheway",
        channel: "instagram-bio",
        campaign: "Launch Week",
      }),
    );
    expect(requirePageSession).toHaveBeenCalledWith("waitlist:view");
    expect(state).toMatchObject({ status: "done" });
    if (state.status !== "done") return;
    const url = new URL(state.url);
    expect(url.pathname).toBe("/ontheway");
    expect(url.searchParams.get("utm_campaign")).toBe("launch-week");
    expect(url.searchParams.get("utm_source")).toBe("instagram");
  });

  it("explains a missing campaign name in plain words", async () => {
    const state = await buildLinkAction(
      { status: "idle" },
      form({ channel: "linkedin", campaign: "   " }),
    );
    expect(state).toMatchObject({ status: "error" });
    if (state.status === "error") expect(state.message).toMatch(/campaign/i);
  });
});
