import { describe, expect, it } from "vitest";
import { parcelSize, shipperBoxOf } from "./orderShipments";

const fallback = {
  parcelLengthCm: 30,
  parcelWidthCm: 25,
  parcelHeightCm: 5,
  defaultItemWeightKg: 0.3,
};
const paddleBox = { lengthCm: 45, widthCm: 25, heightCm: 5, weightGrams: 150 };
const matBox = { lengthCm: 65, widthCm: 12, heightCm: 12, weightGrams: 200 };

describe("parcelSize", () => {
  it("is one box for one item, with the box weight added", () => {
    expect(
      parcelSize([{ quantity: 1, weightGrams: 300, box: paddleBox }], fallback),
    ).toEqual({ lengthCm: 45, widthCm: 25, heightCm: 5, weightKg: 0.45 });
  });

  it("stacks one box per unit", () => {
    expect(
      parcelSize([{ quantity: 2, weightGrams: 300, box: paddleBox }], fallback),
    ).toEqual({ lengthCm: 45, widthCm: 25, heightCm: 10, weightKg: 0.9 });
  });

  it("takes the longest and widest box across categories, heights added", () => {
    expect(
      parcelSize(
        [
          { quantity: 1, weightGrams: 300, box: paddleBox },
          { quantity: 1, weightGrams: 1200, box: matBox },
        ],
        fallback,
      ),
    ).toEqual({ lengthCm: 65, widthCm: 25, heightCm: 17, weightKg: 1.85 });
  });

  it("uses the Settings backup for a missing box or weight", () => {
    expect(
      parcelSize([{ quantity: 1, weightGrams: null, box: null }], fallback),
    ).toEqual({ lengthCm: 30, widthCm: 25, heightCm: 5, weightKg: 0.3 });
  });

  it("never sends less than 50 g", () => {
    expect(
      parcelSize(
        [
          {
            quantity: 1,
            weightGrams: 10,
            box: { ...paddleBox, weightGrams: 0 },
          },
        ],
        fallback,
      ).weightKg,
    ).toBe(0.05);
  });
});

describe("shipperBoxOf", () => {
  it("needs all four parts", () => {
    expect(
      shipperBoxOf({
        boxLengthCm: 45,
        boxWidthCm: 25,
        boxHeightCm: 5,
        boxWeightGrams: null,
      }),
    ).toBeNull();
    expect(
      shipperBoxOf({
        boxLengthCm: 45,
        boxWidthCm: 25,
        boxHeightCm: 5,
        boxWeightGrams: 150,
      }),
    ).toEqual(paddleBox);
  });
});
