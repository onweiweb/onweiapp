import { describe, expect, it } from "vitest";
import { hasAllPermissions, hasPermission } from "./hasPermission";

describe("hasPermission", () => {
  it("returns true when the permission is granted", () => {
    expect(
      hasPermission(["products:write", "orders:read"], "products:write"),
    ).toBe(true);
  });

  it("returns false when the permission is missing", () => {
    expect(hasPermission(["orders:read"], "products:write")).toBe(false);
  });

  it("returns false for an empty grant list", () => {
    expect(hasPermission([], "orders:read")).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when every required permission is present", () => {
    expect(hasAllPermissions(["a", "b", "c"], ["a", "c"])).toBe(true);
  });

  it("returns false when any required permission is missing", () => {
    expect(hasAllPermissions(["a", "b"], ["a", "c"])).toBe(false);
  });

  it("returns true for an empty requirement list", () => {
    expect(hasAllPermissions(["a"], [])).toBe(true);
  });
});
