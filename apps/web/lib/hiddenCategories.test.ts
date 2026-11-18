import { describe, expect, it } from "vitest";
import { showsCategoryLink } from "./hiddenCategories";

describe("showsCategoryLink", () => {
  it("hides only links to hidden categories", () => {
    expect(showsCategoryLink("/collection/pilates", ["pilates"])).toBe(false);
    expect(showsCategoryLink("/collection/pickleball", ["pilates"])).toBe(true);
    expect(showsCategoryLink("/collection/all", ["pilates"])).toBe(true);
    expect(showsCategoryLink("/about", ["pilates"])).toBe(true);
  });
});
