import { describe, expect, it } from "vitest";
import { validateContactInput } from "./contactMessages";

describe("validateContactInput", () => {
  it("accepts a full message and normalises it", () => {
    const result = validateContactInput({
      fullName: "  Asha ",
      email: "Asha@Example.com ",
      phone: "98765 43210",
      message: " Where is my order? ",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        fullName: "Asha",
        email: "asha@example.com",
        phone: "+919876543210",
        message: "Where is my order?",
      },
    });
  });

  it("lets the phone be left out", () => {
    const result = validateContactInput({
      fullName: "Asha",
      email: "asha@example.com",
      phone: "",
      message: "Hi",
    });
    expect(result.ok && result.value.phone).toBeNull();
  });

  it("explains each missing or wrong field in plain words", () => {
    const result = validateContactInput({
      fullName: "",
      email: "nope",
      phone: "12",
      message: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "email",
      "fullName",
      "message",
      "phone",
    ]);
  });

  it("refuses an overly long message", () => {
    const result = validateContactInput({
      fullName: "Asha",
      email: "asha@example.com",
      phone: "",
      message: "x".repeat(3001),
    });
    expect(result.ok).toBe(false);
  });
});
