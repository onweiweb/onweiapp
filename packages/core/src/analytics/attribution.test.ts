import { describe, expect, it } from "vitest";
import {
  readGeoHeaders,
  sanitizeAttribution,
  slugifyUtmValue,
} from "./attribution";

describe("slugifyUtmValue", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugifyUtmValue("  Launch Week!! ")).toBe("launch-week");
  });
  it("caps the length", () => {
    expect(slugifyUtmValue("a".repeat(200))).toHaveLength(64);
  });
});

describe("sanitizeAttribution", () => {
  it("cleans values and strips the protocol, path and www from the referrer", () => {
    expect(
      sanitizeAttribution({
        referrerHost: "https://www.L.Instagram.com/some/path?x=1",
        utmSource: "Instagram",
        utmMedium: "Story ",
        utmCampaign: "Launch Week",
        utmContent: "<script>",
      }),
    ).toEqual({
      referrerHost: "l.instagram.com",
      utmSource: "instagram",
      utmMedium: "story",
      utmCampaign: "launch-week",
      utmContent: "script",
    });
  });
  it("returns nulls for junk input", () => {
    expect(sanitizeAttribution(null).utmSource).toBeNull();
    expect(sanitizeAttribution({ utmSource: 42 }).utmSource).toBeNull();
    expect(sanitizeAttribution({ utmSource: "!!!" }).utmSource).toBeNull();
  });
});

describe("readGeoHeaders", () => {
  it("reads and decodes the host's geo headers", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "IN",
      "x-vercel-ip-country-region": "TG",
      "x-vercel-ip-city": "Hyderabad%20City",
    });
    expect(readGeoHeaders(headers)).toEqual({
      country: "IN",
      region: "TG",
      city: "Hyderabad City",
    });
  });
  it("returns nulls when the headers are missing", () => {
    expect(readGeoHeaders(new Headers())).toEqual({
      country: null,
      region: null,
      city: null,
    });
  });
});
