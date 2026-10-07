import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePageSession = vi.fn();
vi.mock("../../_lib/requirePageSession", () => ({
  requirePageSession: (p: string) => requirePageSession(p),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const saveTrackedLink = vi.fn();
const deleteTrackedLink = vi.fn();
vi.mock("@onwei/core", async () => {
  const actual =
    await vi.importActual<typeof import("@onwei/core")>("@onwei/core");
  return {
    ...actual,
    saveTrackedLink: (i: unknown) => saveTrackedLink(i),
    deleteTrackedLink: (id: string) => deleteTrackedLink(id),
  };
});

import { buildLinkAction, removeLinkAction } from "./actions";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

beforeEach(() => {
  requirePageSession.mockReset().mockResolvedValue({ staffUserId: "s1" });
  saveTrackedLink.mockReset().mockResolvedValue({});
  deleteTrackedLink.mockReset();
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
    expect(saveTrackedLink).toHaveBeenCalledWith({
      url: state.url,
      channelId: "instagram-bio",
      pagePath: "/ontheway",
      campaign: "launch-week",
      content: null,
      createdById: "s1",
    });
  });

  it("explains a missing campaign name in plain words", async () => {
    const state = await buildLinkAction(
      { status: "idle" },
      form({ channel: "linkedin", campaign: "   " }),
    );
    expect(state).toMatchObject({ status: "error" });
    if (state.status === "error") expect(state.message).toMatch(/campaign/i);
    expect(saveTrackedLink).not.toHaveBeenCalled();
  });
});

describe("removeLinkAction", () => {
  it("removes a saved link and checks the permission", async () => {
    deleteTrackedLink.mockResolvedValue(true);
    expect(await removeLinkAction("abc")).toEqual({ ok: true });
    expect(requirePageSession).toHaveBeenCalledWith("waitlist:view");
    expect(deleteTrackedLink).toHaveBeenCalledWith("abc");
  });

  it("says so when the link was already removed", async () => {
    deleteTrackedLink.mockResolvedValue(false);
    const result = await removeLinkAction("gone");
    expect(result.ok).toBe(false);
  });
});
