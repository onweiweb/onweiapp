import { describe, expect, it } from "vitest";
import { insiderExtraText } from "./journeyText";

describe("insiderExtraText", () => {
  it("adds the Insider % on top", () => {
    expect(insiderExtraText(15, 5, "ADD")).toBe("15% + 5% = 20% off");
  });

  it("names the bigger one when only the bigger one counts", () => {
    expect(insiderExtraText(15, 5, "BEST")).toBe(
      "15% off (tier discount is bigger)",
    );
    expect(insiderExtraText(8, 10, "BEST")).toBe(
      "10% off (Insider discount is bigger)",
    );
  });

  it("shows just the tier when there is no Insider discount", () => {
    expect(insiderExtraText(10, 0, "ADD")).toBe("10% off");
  });
});
