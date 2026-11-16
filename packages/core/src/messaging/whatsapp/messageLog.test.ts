import { describe, expect, it } from "vitest";
import { maskPhone } from "./messageLog";

describe("maskPhone", () => {
  it("keeps the country code, first two and last four digits", () => {
    expect(maskPhone("+919876543210")).toBe("+91 98•••• 3210");
    expect(maskPhone("9876543210")).toBe("98•••• 3210");
    expect(maskPhone("+14155552671")).toBe("+1 41•••• 2671");
  });

  it("hides short or broken numbers entirely", () => {
    expect(maskPhone("123")).toBe("••••");
    expect(maskPhone("")).toBe("••••");
  });
});
