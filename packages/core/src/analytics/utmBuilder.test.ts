import { describe, expect, it } from "vitest";
import { buildUtmLink } from "./utmBuilder";

const base = { siteUrl: "https://www.onwei.in", pageUrl: "/ontheway" };

describe("buildUtmLink", () => {
  it("builds a tagged link for a channel", () => {
    expect(
      buildUtmLink({
        ...base,
        channelId: "instagram-bio",
        campaign: "Launch Week",
      }),
    ).toEqual({
      ok: true,
      url: "https://www.onwei.in/ontheway?utm_source=instagram&utm_medium=bio&utm_campaign=launch-week",
      pagePath: "/ontheway",
      campaign: "launch-week",
      content: null,
    });
  });
  it("adds content when given and keeps any existing query", () => {
    const result = buildUtmLink({
      siteUrl: "https://www.onwei.in",
      pageUrl: "/collection?sort=new",
      channelId: "whatsapp",
      campaign: "friends",
      content: "Story 2",
    });
    expect(result.ok && result.pagePath).toBe("/collection");
    expect(result.ok && result.content).toBe("story-2");
    expect(result.ok && result.url).toContain("sort=new");
    expect(result.ok && result.url).toContain("utm_content=story-2");
  });
  it("rejects an unknown channel and an empty campaign", () => {
    expect(buildUtmLink({ ...base, channelId: "nope", campaign: "x" })).toEqual(
      {
        ok: false,
        reason: "UNKNOWN_CHANNEL",
      },
    );
    expect(
      buildUtmLink({ ...base, channelId: "linkedin", campaign: "  !! " }),
    ).toEqual({ ok: false, reason: "EMPTY_CAMPAIGN" });
  });
});
