import { describe, expect, it } from "vitest";
import { needsTrackingNumber, trackingNumbersIn } from "./trackingMatch";

describe("trackingNumbersIn", () => {
  it("picks tracking numbers out of a copied portal row", () => {
    const row =
      "CARD-0059\tSamarth Goyal\t26 Nov 26 10:13 AM\t₹1.00\tPrepaid\t1\t21025866121144\tToday\t0.03 kg\n" +
      "CARD-0157 Sabhya 375680662726 N/A 21025866121144";
    expect(trackingNumbersIn(row)).toEqual(["21025866121144", "375680662726"]);
  });

  it("ignores short numbers and stops at 100", () => {
    expect(trackingNumbersIn("560103 9876 2026")).toEqual([]);
    expect(trackingNumbersIn("CARD-T17641234567890 ONW17641234567")).toEqual(
      [],
    );
    const many = Array.from({ length: 150 }, (_, i) => String(1e11 + i));
    expect(trackingNumbersIn(many.join(" "))).toHaveLength(100);
  });
});

describe("needsTrackingNumber", () => {
  it("is a duplicate refusal with no tracking number", () => {
    expect(
      needsTrackingNumber({
        status: "FAILED",
        error: "iThink said: Order No. Already Exist.",
        awb: null,
      }),
    ).toBe(true);
    expect(
      needsTrackingNumber({
        status: "SENDING",
        error:
          "iThink already has this booking but didn't send its tracking number.",
        awb: null,
      }),
    ).toBe(true);
    expect(
      needsTrackingNumber({
        status: "FAILED",
        error: "iThink can't deliver to this PIN code.",
        awb: null,
      }),
    ).toBe(false);
    expect(
      needsTrackingNumber({ status: "SENDING", error: null, awb: null }),
    ).toBe(false);
  });
});
