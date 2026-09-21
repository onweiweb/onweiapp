import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("formats whole-rupee amounts", () => {
    expect(formatCurrency(150000)).toBe("₹1,500.00");
  });

  it("formats amounts with paise", () => {
    expect(formatCurrency(150050)).toBe("₹1,500.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₹0.00");
  });
});
