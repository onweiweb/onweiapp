import { describe, expect, it } from "vitest";
import { validatePhone } from "./phone";

describe("validatePhone", () => {
  it("accepts a bare 10-digit Indian mobile number", () => {
    const result = validatePhone("9876543210", { allowInternational: true });
    expect(result.valid).toBe(true);
    expect(result.e164).toBe("+919876543210");
  });

  it("accepts the same number with a +91 prefix and normalizes identically", () => {
    const result = validatePhone("+91 98765 43210", {
      allowInternational: true,
    });
    expect(result.valid).toBe(true);
    expect(result.e164).toBe("+919876543210");
  });

  it("rejects an invalid number", () => {
    const result = validatePhone("12345", { allowInternational: true });
    expect(result.valid).toBe(false);
    expect(result.e164).toBeUndefined();
  });

  it("rejects empty input", () => {
    expect(validatePhone("", { allowInternational: true }).valid).toBe(false);
    expect(validatePhone("   ", { allowInternational: true }).valid).toBe(
      false,
    );
  });

  it("accepts a valid international number when allowInternational is true", () => {
    const result = validatePhone("+1 415 555 2671", {
      allowInternational: true,
    });
    expect(result.valid).toBe(true);
    expect(result.e164).toBe("+14155552671");
  });

  it("rejects a valid international number when allowInternational is false", () => {
    const result = validatePhone("+1 415 555 2671", {
      allowInternational: false,
    });
    expect(result.valid).toBe(false);
  });

  it("still accepts a valid Indian number when allowInternational is false", () => {
    const result = validatePhone("9876543210", { allowInternational: false });
    expect(result.valid).toBe(true);
  });
});
