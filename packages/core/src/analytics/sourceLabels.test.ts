import { describe, expect, it } from "vitest";
import { describeSource } from "./sourceLabels";

describe("describeSource", () => {
  it("names UTM sources with their medium", () => {
    expect(describeSource({ utmSource: "instagram", utmMedium: "story" })).toBe(
      "Instagram story",
    );
    expect(
      describeSource({ utmSource: "whatsapp", utmMedium: "message" }),
    ).toBe("WhatsApp message");
  });
  it("prefers UTM over the referrer", () => {
    expect(
      describeSource({
        utmSource: "linkedin",
        referrerHost: "l.instagram.com",
      }),
    ).toBe("LinkedIn");
  });
  it("falls back to a friendly referrer name", () => {
    expect(describeSource({ referrerHost: "l.instagram.com" })).toBe(
      "Instagram",
    );
    expect(describeSource({ referrerHost: "www.google.co.in" })).toBe("Google");
    expect(describeSource({ referrerHost: "example.org" })).toBe("example.org");
  });
  it("calls no referrer, or our own site, direct", () => {
    expect(describeSource({})).toBe("Direct or unknown");
    expect(
      describeSource({ referrerHost: "onwei.in", ownHost: "www.onwei.in" }),
    ).toBe("Direct or unknown");
  });
});
