import { describe, expect, it } from "vitest";
import { mapAttributes, mapSpecs, summarizeProductReviews } from "./mapProduct";

describe("mapAttributes", () => {
  it("passes through a plain object of string values", () => {
    expect(mapAttributes({ color: "Blue", size: "M" })).toEqual({
      color: "Blue",
      size: "M",
    });
  });

  it("drops non-string values instead of letting them through", () => {
    expect(mapAttributes({ color: "Blue", weight: 42, active: true })).toEqual({
      color: "Blue",
    });
  });

  it("falls back to an empty object for null", () => {
    expect(mapAttributes(null)).toEqual({});
  });

  it("falls back to an empty object for a non-object shape", () => {
    expect(mapAttributes("not an object")).toEqual({});
    expect(mapAttributes(42)).toEqual({});
  });

  it("falls back to an empty object for an array (an object per typeof, but not the intended shape)", () => {
    expect(mapAttributes(["color", "size"])).toEqual({});
  });
});

describe("mapSpecs", () => {
  it("keeps well-formed entries", () => {
    expect(mapSpecs([{ label: "Weight", value: "250g" }])).toEqual([
      { label: "Weight", value: "250g" },
    ]);
  });

  it("filters out malformed entries instead of throwing", () => {
    expect(
      mapSpecs([
        { label: "Weight", value: "250g" },
        { label: "Missing value" },
        "not an object",
        null,
      ]),
    ).toEqual([{ label: "Weight", value: "250g" }]);
  });

  it("falls back to an empty array for a non-array shape", () => {
    expect(mapSpecs(null)).toEqual([]);
    expect(mapSpecs({ label: "Weight", value: "250g" })).toEqual([]);
  });
});

describe("summarizeProductReviews", () => {
  it("returns null when there are no reviews", () => {
    expect(summarizeProductReviews([])).toBeNull();
    expect(summarizeProductReviews(undefined)).toBeNull();
  });

  it("averages ratings and counts them", () => {
    expect(
      summarizeProductReviews([{ rating: 5 }, { rating: 3 }, { rating: 4 }]),
    ).toEqual({ average: 4, count: 3 });
  });
});
