import { describe, expect, it } from "vitest";
import {
  derivePriceRangeMinorUnits,
  deriveInStock,
  pickLeadImage,
  toMinorUnits,
} from "./helpers";
import type { ProductImageDTO } from "./types";

describe("toMinorUnits", () => {
  it("converts a plain number of rupees to paise", () => {
    expect(toMinorUnits(1500)).toBe(150000);
  });

  it("converts a Decimal-like object to paise", () => {
    expect(toMinorUnits({ toNumber: () => 999.5 })).toBe(99950);
  });

  it("rounds to the nearest paisa", () => {
    expect(toMinorUnits({ toNumber: () => 10.005 })).toBe(1001);
  });
});

describe("derivePriceRangeMinorUnits", () => {
  it("returns the same min and max for a single variant", () => {
    expect(derivePriceRangeMinorUnits([{ priceMinorUnits: 150000 }])).toEqual({
      min: 150000,
      max: 150000,
    });
  });

  it("returns the actual min and max across multiple variants", () => {
    const variants = [
      { priceMinorUnits: 150000 },
      { priceMinorUnits: 99900 },
      { priceMinorUnits: 349900 },
    ];
    expect(derivePriceRangeMinorUnits(variants)).toEqual({
      min: 99900,
      max: 349900,
    });
  });
});

describe("deriveInStock", () => {
  it("is true when net stock is positive", () => {
    expect(deriveInStock([{ quantityOnHand: 10, quantityReserved: 2 }])).toBe(
      true,
    );
  });

  it("is false when net stock is zero across all warehouses", () => {
    expect(
      deriveInStock([
        { quantityOnHand: 5, quantityReserved: 5 },
        { quantityOnHand: 0, quantityReserved: 0 },
      ]),
    ).toBe(false);
  });

  it("is false for no inventory rows at all", () => {
    expect(deriveInStock([])).toBe(false);
  });

  it("treats over-reserved stock as out of stock, not negative", () => {
    expect(deriveInStock([{ quantityOnHand: 2, quantityReserved: 5 }])).toBe(
      false,
    );
  });
});

describe("pickLeadImage", () => {
  const placeholder: ProductImageDTO = {
    url: "/placeholder.jpg",
    altText: null,
    isPlaceholder: true,
  };
  const real: ProductImageDTO = {
    url: "/real.jpg",
    altText: "Product photo",
    isPlaceholder: false,
  };

  it("returns null for an empty array", () => {
    expect(pickLeadImage([])).toBeNull();
  });

  it("prefers the first non-placeholder image", () => {
    expect(pickLeadImage([placeholder, real])).toBe(real);
  });

  it("falls back to the first placeholder when nothing else exists", () => {
    expect(pickLeadImage([placeholder])).toBe(placeholder);
  });
});
