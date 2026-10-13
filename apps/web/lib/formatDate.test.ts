import { describe, expect, it } from "vitest";
import { formatArticleDate } from "./formatDate";

describe("formatArticleDate", () => {
  it("formats a Date like Figma", () => {
    expect(formatArticleDate(new Date("2026-02-25T00:00:00.000Z"))).toBe(
      "Feb 25, 2026",
    );
  });

  it("accepts the ISO string a cached query returns", () => {
    expect(formatArticleDate("2026-02-25T00:00:00.000Z")).toBe("Feb 25, 2026");
  });
});
