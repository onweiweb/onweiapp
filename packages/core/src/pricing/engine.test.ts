import { describe, expect, it } from "vitest";
import {
  allocate,
  gstPortion,
  priceCart,
  type PricingCoupon,
  type PricingInput,
  type PricingLine,
} from "./engine";

const R = (rupees: number) => Math.round(rupees * 100);

function line(overrides: Partial<PricingLine> & { key: string }): PricingLine {
  return {
    productId: `p-${overrides.key}`,
    categoryId: "pickleball",
    unitPrice: R(1000),
    compareAtPrice: null,
    quantity: 1,
    ...overrides,
  };
}

function coupon(
  overrides: Partial<PricingCoupon> & { id: string },
): PricingCoupon {
  return {
    code: overrides.id.toUpperCase(),
    label: overrides.id,
    give: { type: "PERCENTAGE", percent: 10 },
    maxDiscount: null,
    scope: "CART",
    categoryIds: [],
    productIds: [],
    excludeSaleItems: false,
    minOrderValue: null,
    minItems: null,
    combinableWithCoupons: false,
    combinableWithInsider: false,
    prepaidOnly: false,
    priority: 0,
    createdAt: 0,
    source: "code",
    ...overrides,
  };
}

function input(overrides: Partial<PricingInput>): PricingInput {
  return {
    lines: [line({ key: "a" })],
    insider: null,
    coupons: [],
    paymentMethod: null,
    shipping: { freeThreshold: R(999), fee: R(99) },
    codFee: R(49),
    ...overrides,
  };
}

describe("allocate", () => {
  it("always adds up exactly and favours the largest line with leftovers", () => {
    const out = allocate(100, [
      { key: "a", value: 1000 },
      { key: "b", value: 1000 },
      { key: "c", value: 1000 },
    ]);
    expect(out.a! + out.b! + out.c!).toBe(100);
    const big = allocate(1001, [
      { key: "small", value: 333 },
      { key: "large", value: 667 },
      { key: "mid", value: 500 },
    ]);
    expect(Object.values(big).reduce((s, v) => s + v, 0)).toBe(1001);
  });

  it("never gives a line more than it is worth", () => {
    const out = allocate(10_000, [
      { key: "a", value: 30 },
      { key: "b", value: 70 },
    ]);
    expect(out).toEqual({ a: 30, b: 70 });
  });
});

describe("gstPortion", () => {
  it("takes the GST out of an inclusive price", () => {
    expect(gstPortion(R(1050), 5)).toBe(R(50));
    expect(gstPortion(R(1180), 18)).toBe(R(180));
    expect(gstPortion(R(100), 0)).toBe(0);
  });
});

describe("priceCart basics", () => {
  it("charges delivery below the free threshold and not above", () => {
    const below = priceCart(
      input({ lines: [line({ key: "a", unitPrice: R(500) })] }),
    );
    expect(below.shippingFee).toBe(R(99));
    expect(below.total).toBe(R(599));
    expect(below.freeShippingRemaining).toBe(R(499));

    const above = priceCart(
      input({ lines: [line({ key: "a", unitPrice: R(999) })] }),
    );
    expect(above.shippingFee).toBe(0);
    expect(above.freeShippingRemaining).toBe(0);
  });

  it("checks free delivery against the amount after discounts", () => {
    const result = priceCart(
      input({
        lines: [line({ key: "a", unitPrice: R(1000) })],
        insider: { percent: 5 },
      }),
    );
    expect(result.merchandiseTotal).toBe(R(950));
    expect(result.shippingFee).toBe(R(99));
  });

  it("adds the COD fee only for cash on delivery", () => {
    expect(priceCart(input({ paymentMethod: "COD" })).codFee).toBe(R(49));
    expect(priceCart(input({ paymentMethod: "RAZORPAY" })).codFee).toBe(0);
  });

  it("charges nothing for an empty cart", () => {
    const result = priceCart(input({ lines: [], paymentMethod: "COD" }));
    expect(result.total).toBe(0);
    expect(result.shippingFee).toBe(0);
  });
});

describe("Insider discount", () => {
  it("takes the percent off every line, split to the paisa", () => {
    const result = priceCart(
      input({
        lines: [
          line({ key: "a", unitPrice: R(333.33) }),
          line({ key: "b", unitPrice: R(666.67), quantity: 2 }),
        ],
        insider: { percent: 5 },
      }),
    );
    expect(result.insiderApplied).toBe(true);
    const insider = result.discounts[0]!;
    expect(insider.amount).toBe(Math.floor(R(1666.67) * 0.05 + 0.5));
    expect(result.lines.reduce((s, l) => s + l.discount, 0)).toBe(
      insider.amount,
    );
  });
});

describe("coupon types", () => {
  it("percent with a maximum", () => {
    const result = priceCart(
      input({
        lines: [line({ key: "a", unitPrice: R(5000) })],
        coupons: [
          coupon({
            id: "big",
            give: { type: "PERCENTAGE", percent: 20 },
            maxDiscount: R(500),
          }),
        ],
      }),
    );
    expect(result.discountTotal).toBe(R(500));
  });

  it("flat never goes below zero", () => {
    const result = priceCart(
      input({
        lines: [line({ key: "a", unitPrice: R(100) })],
        coupons: [
          coupon({ id: "flat", give: { type: "FLAT", amount: R(500) } }),
        ],
      }),
    );
    expect(result.merchandiseTotal).toBe(0);
    expect(result.total).toBe(R(99)); // delivery still due
  });

  it("buy 2 get 1 makes the cheapest unit free", () => {
    const result = priceCart(
      input({
        lines: [
          line({ key: "a", unitPrice: R(1000), quantity: 2 }),
          line({ key: "b", unitPrice: R(400) }),
        ],
        coupons: [
          coupon({
            id: "b2g1",
            give: { type: "BUY_X_GET_Y", buyQty: 2, getQty: 1 },
          }),
        ],
      }),
    );
    expect(result.discountTotal).toBe(R(400));
    expect(result.lines.find((l) => l.key === "b")!.total).toBe(0);
  });

  it("buy 2 get 1 needs three items", () => {
    const result = priceCart(
      input({
        lines: [line({ key: "a", quantity: 2 })],
        coupons: [
          coupon({
            id: "b2g1",
            give: { type: "BUY_X_GET_Y", buyQty: 2, getQty: 1 },
          }),
        ],
      }),
    );
    expect(result.discountTotal).toBe(0);
    expect(result.rejected[0]).toMatchObject({ reason: "MIN_ITEMS", short: 1 });
  });

  it("tiered picks the highest tier reached", () => {
    const tiered = coupon({
      id: "tier",
      give: {
        type: "TIERED",
        tiers: [
          { minSubtotal: R(2000), percent: 10 },
          { minSubtotal: R(3500), percent: 15 },
        ],
      },
    });
    expect(
      priceCart(
        input({
          lines: [line({ key: "a", unitPrice: R(2500) })],
          coupons: [tiered],
        }),
      ).discountTotal,
    ).toBe(R(250));
    expect(
      priceCart(
        input({
          lines: [line({ key: "a", unitPrice: R(4000) })],
          coupons: [tiered],
        }),
      ).discountTotal,
    ).toBe(R(600));
  });

  it("free delivery removes only the delivery fee", () => {
    const result = priceCart(
      input({
        lines: [line({ key: "a", unitPrice: R(500) })],
        coupons: [coupon({ id: "ship", give: { type: "FREE_SHIPPING" } })],
      }),
    );
    expect(result.shippingFee).toBe(0);
    expect(result.shippingSaved).toBe(R(99));
    expect(result.discountTotal).toBe(0);
    expect(result.total).toBe(R(500));
  });
});

describe("coupon conditions", () => {
  it("names how much more is needed for the minimum", () => {
    const result = priceCart(
      input({ coupons: [coupon({ id: "min", minOrderValue: R(1500) })] }),
    );
    expect(result.rejected).toEqual([
      { couponId: "min", code: "MIN", reason: "MIN_ORDER", short: R(500) },
    ]);
  });

  it("applies scope and skips sale items when asked", () => {
    const result = priceCart(
      input({
        lines: [
          line({ key: "a", categoryId: "pilates", unitPrice: R(1000) }),
          line({ key: "b", categoryId: "pickleball", unitPrice: R(1000) }),
          line({
            key: "c",
            categoryId: "pilates",
            unitPrice: R(800),
            compareAtPrice: R(1000),
          }),
        ],
        coupons: [
          coupon({
            id: "pilates",
            scope: "CATEGORIES",
            categoryIds: ["pilates"],
            excludeSaleItems: true,
          }),
        ],
      }),
    );
    expect(result.lines.find((l) => l.key === "a")!.discount).toBe(R(100));
    expect(result.lines.find((l) => l.key === "b")!.discount).toBe(0);
    expect(result.lines.find((l) => l.key === "c")!.discount).toBe(0);
  });

  it("says when no item in the cart qualifies", () => {
    const result = priceCart(
      input({
        coupons: [coupon({ id: "p", scope: "PRODUCTS", productIds: ["nope"] })],
      }),
    );
    expect(result.rejected[0]?.reason).toBe("NO_ELIGIBLE_ITEMS");
  });

  it("refuses prepaid-only coupons with cash on delivery", () => {
    const result = priceCart(
      input({
        paymentMethod: "COD",
        coupons: [coupon({ id: "upi", prepaidOnly: true })],
      }),
    );
    expect(result.rejected[0]?.reason).toBe("PREPAID_ONLY");
    expect(result.discountTotal).toBe(0);
  });

  it("checks a later coupon's minimum after earlier discounts", () => {
    const result = priceCart(
      input({
        lines: [line({ key: "a", unitPrice: R(1000) })],
        insider: { percent: 5 },
        coupons: [
          coupon({
            id: "min1000",
            minOrderValue: R(1000),
            combinableWithInsider: true,
          }),
        ],
      }),
    );
    // With the Insider 5% the cart drops to 950 and the coupon can't apply;
    // the coupon alone (10%) saves more, so the coupon wins.
    expect(result.insiderApplied).toBe(false);
    expect(result.discountTotal).toBe(R(100));
  });
});

describe("combining", () => {
  it("never combines in either direction unless both allow it", () => {
    const a = coupon({
      id: "a",
      give: { type: "PERCENTAGE", percent: 10 },
      combinableWithCoupons: true,
    });
    const b = coupon({
      id: "b",
      give: { type: "PERCENTAGE", percent: 15 },
      combinableWithCoupons: false,
    });
    const result = priceCart(
      input({
        lines: [line({ key: "x", unitPrice: R(2000) })],
        coupons: [a, b],
      }),
    );
    expect(result.discounts.map((d) => d.code)).toEqual(["B"]);
    expect(result.rejected).toEqual([
      { couponId: "a", code: "A", reason: "NOT_WITH_COUPON", blockedBy: "B" },
    ]);
  });

  it("stacks two combinable coupons in order", () => {
    const a = coupon({
      id: "a",
      give: { type: "PERCENTAGE", percent: 10 },
      combinableWithCoupons: true,
    });
    const b = coupon({
      id: "b",
      give: { type: "FLAT", amount: R(100) },
      combinableWithCoupons: true,
      priority: 5,
    });
    const result = priceCart(
      input({
        lines: [line({ key: "x", unitPrice: R(2000) })],
        coupons: [a, b],
      }),
    );
    // Higher priority first: 2000 - 100 = 1900, then 10% = 190.
    expect(result.discountTotal).toBe(R(290));
  });

  it("gives the better of Insider and a code that can't combine with it", () => {
    const small = coupon({
      id: "small",
      give: { type: "PERCENTAGE", percent: 3 },
    });
    const result = priceCart(
      input({ insider: { percent: 5 }, coupons: [small] }),
    );
    expect(result.insiderApplied).toBe(true);
    expect(result.rejected[0]?.reason).toBe("NOT_WITH_INSIDER");

    const big = coupon({
      id: "big",
      give: { type: "PERCENTAGE", percent: 20 },
    });
    const result2 = priceCart(
      input({ insider: { percent: 5 }, coupons: [big] }),
    );
    expect(result2.insiderApplied).toBe(false);
    expect(result2.insiderBlockedBy).toBe("BIG");
    expect(result2.discountTotal).toBe(R(200));
  });

  it("uses Insider and a code together when the code allows it", () => {
    const ok = coupon({ id: "ok", combinableWithInsider: true });
    const result = priceCart(
      input({
        lines: [line({ key: "x", unitPrice: R(2000) })],
        insider: { percent: 5 },
        coupons: [ok],
      }),
    );
    // 2000 - 5% = 1900, then 10% = 190, total 290.
    expect(result.discountTotal).toBe(R(290));
    expect(result.insiderApplied).toBe(true);
  });

  it("picks the best automatic offer when they can't combine", () => {
    const autoA = coupon({
      id: "auto-a",
      source: "auto",
      give: { type: "FLAT", amount: R(50) },
    });
    const autoB = coupon({
      id: "auto-b",
      source: "auto",
      give: { type: "FLAT", amount: R(80) },
    });
    const result = priceCart(input({ coupons: [autoA, autoB] }));
    expect(result.discountTotal).toBe(R(80));
    // Automatic offers that lose are not shown as errors.
    expect(result.rejected).toEqual([]);
  });

  it("counts the same code once", () => {
    const a = coupon({ id: "a", give: { type: "FLAT", amount: R(100) } });
    const result = priceCart(input({ coupons: [a, a] }));
    expect(result.discountTotal).toBe(R(100));
  });

  it("totals always add up", () => {
    const result = priceCart(
      input({
        lines: [
          line({ key: "a", unitPrice: R(1299), quantity: 3 }),
          line({ key: "b", unitPrice: R(449.5), quantity: 1 }),
        ],
        insider: { percent: 7 },
        coupons: [
          coupon({
            id: "c",
            combinableWithInsider: true,
            give: { type: "PERCENTAGE", percent: 13 },
          }),
        ],
        paymentMethod: "COD",
      }),
    );
    const linesTotal = result.lines.reduce((s, l) => s + l.total, 0);
    expect(linesTotal).toBe(result.merchandiseTotal);
    expect(result.subtotal - result.discountTotal).toBe(
      result.merchandiseTotal,
    );
    expect(result.discounts.reduce((s, d) => s + d.amount, 0)).toBe(
      result.discountTotal,
    );
    expect(result.total).toBe(
      result.merchandiseTotal + result.shippingFee + result.codFee,
    );
    for (const l of result.lines) expect(l.total).toBeGreaterThanOrEqual(0);
  });
});
