import { describe, expect, it } from "vitest";
import { checkSiteReview } from "./submitReview";

const ok = {
  rating: 5,
  title: "Best mat",
  body: "Five days a week and it still grips.",
  name: "Melanie N.",
  email: "mel@example.com",
};

describe("checkSiteReview", () => {
  it("accepts a complete review", () => {
    expect(checkSiteReview(ok)).toBeNull();
    expect(checkSiteReview({ ...ok, title: undefined })).toBeNull();
  });

  it("names the first problem", () => {
    expect(checkSiteReview({ ...ok, rating: 0 })).toBe("INVALID_RATING");
    expect(checkSiteReview({ ...ok, rating: 4.5 })).toBe("INVALID_RATING");
    expect(checkSiteReview({ ...ok, title: "x".repeat(81) })).toBe(
      "TITLE_TOO_LONG",
    );
    expect(checkSiteReview({ ...ok, body: "  short " })).toBe("BODY_TOO_SHORT");
    expect(checkSiteReview({ ...ok, body: "x".repeat(1501) })).toBe(
      "BODY_TOO_LONG",
    );
    expect(checkSiteReview({ ...ok, name: " " })).toBe("INVALID_NAME");
    expect(checkSiteReview({ ...ok, email: "not-an-email" })).toBe(
      "INVALID_EMAIL",
    );
  });
});
