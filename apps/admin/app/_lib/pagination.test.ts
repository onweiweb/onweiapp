import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageWindow, parsePage, trimPage } from "./pagination";

describe("parsePage", () => {
  it("defaults to 1 for missing or invalid values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
  });

  it("reads a valid page number", () => {
    expect(parsePage("4")).toBe(4);
  });
});

describe("pageWindow", () => {
  it("skips earlier pages and fetches one extra row", () => {
    expect(pageWindow(1)).toEqual({ skip: 0, take: PAGE_SIZE + 1 });
    expect(pageWindow(3, 10)).toEqual({ skip: 20, take: 11 });
  });
});

describe("trimPage", () => {
  it("reports a next page when the look-ahead row exists", () => {
    const result = trimPage([1, 2, 3], 2);
    expect(result.rows).toEqual([1, 2]);
    expect(result.hasNext).toBe(true);
  });

  it("reports no next page when rows fit", () => {
    const result = trimPage([1, 2], 2);
    expect(result.rows).toEqual([1, 2]);
    expect(result.hasNext).toBe(false);
  });
});
