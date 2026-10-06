import { describe, expect, it } from "vitest";
import { readFirstTouchFromUrl, referrerHostOf } from "./attribution";

describe("referrerHostOf", () => {
  it("returns the host without www", () => {
    expect(referrerHostOf("https://www.linkedin.com/feed", "onwei.in")).toBe(
      "linkedin.com",
    );
  });
  it("treats our own site and empty or bad referrers as none", () => {
    expect(referrerHostOf("https://www.onwei.in/about", "onwei.in")).toBeNull();
    expect(referrerHostOf("", "onwei.in")).toBeNull();
    expect(referrerHostOf("not a url", "onwei.in")).toBeNull();
  });
});

describe("readFirstTouchFromUrl", () => {
  it("reads the UTM params and referrer", () => {
    expect(
      readFirstTouchFromUrl(
        "?utm_source=instagram&utm_medium=bio&utm_campaign=launch",
        "https://l.instagram.com/",
        "onwei.in",
      ),
    ).toEqual({
      utmSource: "instagram",
      utmMedium: "bio",
      utmCampaign: "launch",
      utmContent: null,
      referrerHost: "l.instagram.com",
    });
  });
});
