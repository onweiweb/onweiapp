import { describe, expect, it } from "vitest";
import { formatDuration, formatPercent } from "./_format";

describe("formatDuration", () => {
  it("reads naturally", () => {
    expect(formatDuration(0)).toBe("under a second");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(95)).toBe("1m 35s");
    expect(formatDuration(120)).toBe("2m");
  });
});

describe("formatPercent", () => {
  it("keeps one decimal", () => {
    expect(formatPercent(0.4)).toBe("40%");
    expect(formatPercent(0.12345)).toBe("12.3%");
  });
});
