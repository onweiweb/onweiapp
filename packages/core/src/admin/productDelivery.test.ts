import { describe, expect, it } from "vitest";
import {
  checkShipperBox,
  checkWeightGrams,
  deliveryGapsMessage,
} from "./productDelivery";

describe("checkShipperBox", () => {
  const box = { lengthCm: 45, widthCm: 25, heightCm: 5, weightGrams: 150 };
  it("accepts a full box or an empty one", () => {
    expect(checkShipperBox(box)).toBeNull();
    expect(
      checkShipperBox({
        lengthCm: null,
        widthCm: null,
        heightCm: null,
        weightGrams: null,
      }),
    ).toBeNull();
  });
  it("refuses a half-filled box or silly sizes", () => {
    expect(checkShipperBox({ ...box, weightGrams: null })).toContain("Fill in");
    expect(checkShipperBox({ ...box, lengthCm: 0 })).toContain("0.5 and 200");
    expect(checkShipperBox({ ...box, weightGrams: 1.5 })).toContain("grams");
  });
});

describe("checkWeightGrams", () => {
  it("wants whole grams", () => {
    expect(checkWeightGrams(250)).toBeNull();
    expect(checkWeightGrams(null)).toBeNull();
    expect(checkWeightGrams(0)).not.toBeNull();
    expect(checkWeightGrams(2.5)).not.toBeNull();
  });
});

describe("deliveryGapsMessage", () => {
  it("lists what's missing", () => {
    expect(
      deliveryGapsMessage(["the shipper box for Pickleball (Categories)"]),
    ).toBe(
      "Missing delivery details: add the shipper box for Pickleball (Categories). Until then, orders go to the courier with the backup size and weight from Settings.",
    );
  });
});
