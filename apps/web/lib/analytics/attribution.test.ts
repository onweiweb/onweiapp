import { beforeEach, describe, expect, it } from "vitest";
import {
  getFirstTouch,
  readFirstTouchFromUrl,
  referrerHostOf,
} from "./attribution";

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

describe("getFirstTouch", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("keeps a direct landing empty, then saves a tagged link followed later in the same tab", () => {
    window.history.pushState({}, "", "/ontheway");
    expect(getFirstTouch().utmSource).toBeNull();

    window.history.pushState(
      {},
      "",
      "/ontheway?utm_source=instagram&utm_campaign=launch",
    );
    expect(getFirstTouch()).toMatchObject({
      utmSource: "instagram",
      utmCampaign: "launch",
    });

    // A third page without tags keeps the saved touch.
    window.history.pushState({}, "", "/about");
    expect(getFirstTouch().utmSource).toBe("instagram");
  });
});
