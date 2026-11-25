import { describe, expect, it } from "vitest";
import {
  liveTier,
  tierState,
  tierWindows,
  validatePreorderCampaign,
  type PreorderCampaignInput,
} from "./campaign";
import { customerCanCancel, preorderDeadlines, reserveForBag } from "./rules";
import { storefrontStateOf } from "./storefront";

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2026-12-01T00:00:00+05:30");

describe("tier timing", () => {
  const tiers = tierWindows(start, [
    { id: "1", days: 7 },
    { id: "2", days: 7 },
    { id: "3", days: 7 },
  ]).map((t, i) => ({
    ...t,
    position: i + 1,
    label: `Tier ${i + 1}`,
    percent: [15, 10, 8][i]!,
    giftVariantId: null,
    giftLabel: null,
  }));

  it("runs tiers back to back", () => {
    expect(tiers[1]!.startsAt.getTime()).toBe(start.getTime() + 7 * DAY);
    expect(tiers[2]!.endsAt.getTime()).toBe(start.getTime() + 21 * DAY);
  });

  it("finds the live tier and each tier's state", () => {
    const day9 = new Date(start.getTime() + 8.5 * DAY);
    expect(liveTier({ isActive: true, tiers }, day9)?.label).toBe("Tier 2");
    expect(tiers.map((t) => tierState(t, day9))).toEqual([
      "CLOSED",
      "LIVE",
      "LOCKED",
    ]);
    expect(liveTier({ isActive: false, tiers }, day9)).toBeNull();
    expect(
      liveTier({ isActive: true, tiers }, new Date(start.getTime() - 1)),
    ).toBeNull();
    expect(
      liveTier({ isActive: true, tiers }, new Date(start.getTime() + 21 * DAY)),
    ).toBeNull();
  });
});

describe("reserve from the bag", () => {
  const settings = {
    reserveLow: 50000,
    reserveHigh: 90000,
    reserveThreshold: 400000,
  };

  it("takes ₹500 up to ₹4,000 at product price", () => {
    expect(
      reserveForBag(settings, { productTotal: 249900, total: 212400 }),
    ).toEqual({ reserveTotal: 50000, balanceDue: 162400 });
    expect(
      reserveForBag(settings, { productTotal: 400000, total: 340000 })
        .reserveTotal,
    ).toBe(50000);
  });

  it("takes ₹900 above ₹4,000, before any discount", () => {
    // ₹5,498 of products, lap 1 + Insider = 20% off: ₹4,398.40 total.
    expect(
      reserveForBag(settings, { productTotal: 549800, total: 439840 }),
    ).toEqual({ reserveTotal: 90000, balanceDue: 349840 });
    expect(
      reserveForBag(settings, { productTotal: 400100, total: 320080 })
        .reserveTotal,
    ).toBe(90000);
  });

  it("never asks for more than the order total", () => {
    expect(
      reserveForBag(settings, { productTotal: 99900, total: 30000 }),
    ).toEqual({ reserveTotal: 30000, balanceDue: 0 });
  });
});

describe("deadlines and cancelling", () => {
  const endsAt = new Date(start.getTime() + 30 * DAY);
  const deadlines = preorderDeadlines({
    endsAt,
    nudgeDaysBeforeClose: 7,
    balanceDueDaysAfterClose: 7,
  });

  it("nudges a week before close and wants the balance a week after", () => {
    expect(deadlines.closesAt).toEqual(endsAt);
    expect(deadlines.nudgeAt.getTime()).toBe(endsAt.getTime() - 7 * DAY);
    expect(deadlines.balanceDueAt.getTime()).toBe(endsAt.getTime() + 7 * DAY);
  });

  const reserved = {
    status: "RESERVED",
    balanceNudgedAt: null,
    balancePaidAt: null,
  };

  it("lets the customer cancel until the window closes", () => {
    const before = new Date(endsAt.getTime() - 1);
    expect(customerCanCancel(reserved, endsAt, before)).toBe(true);
    expect(customerCanCancel(reserved, endsAt, endsAt)).toBe(false);
  });

  it("locks cancelling once the nudge went out or the balance is paid", () => {
    const mid = new Date(start.getTime() + 2 * DAY);
    expect(
      customerCanCancel({ ...reserved, balanceNudgedAt: mid }, endsAt, mid),
    ).toBe(false);
    expect(
      customerCanCancel({ ...reserved, balancePaidAt: mid }, endsAt, mid),
    ).toBe(false);
    expect(
      customerCanCancel({ ...reserved, status: "CONFIRMED" }, endsAt, mid),
    ).toBe(false);
    expect(customerCanCancel(reserved, null, mid)).toBe(false);
  });
});

describe("campaign form checks", () => {
  const good: PreorderCampaignInput = {
    name: "Launch pre-order",
    isActive: true,
    startDate: "2026-12-01",
    reserveLow: 500,
    reserveHigh: 900,
    reserveThreshold: 4000,
    nudgeDaysBeforeClose: 7,
    balanceDueDaysAfterClose: 7,
    expectedShipDate: null,
    productIds: ["p1"],
    insiderGiftVariantId: null,
    tiers: [
      {
        label: "Tier 1",
        days: 7,
        percent: 15,
        giftVariantId: null,
        giftLabel: null,
      },
    ],
  };

  it("accepts a sensible campaign", () => {
    expect(validatePreorderCampaign(good)).toEqual({});
  });

  it("explains each problem", () => {
    const errors = validatePreorderCampaign({
      ...good,
      name: "",
      reserveLow: 0,
      balanceDueDaysAfterClose: 0,
      productIds: [],
      tiers: [{ ...good.tiers[0]!, days: 0 }],
    });
    expect(errors.name).toBeTruthy();
    expect(errors.reserveLow).toBeTruthy();
    expect(errors.balanceDueDaysAfterClose).toBeTruthy();
    expect(errors.productIds).toBeTruthy();
    expect(errors.tier0).toBeTruthy();
  });
});

describe("storefront state", () => {
  const tiers = tierWindows(start, [
    { id: "1", days: 7 },
    { id: "2", days: 7 },
  ]).map((t, i) => ({
    ...t,
    position: i + 1,
    label: `Tier ${i + 1}`,
    percent: 10,
    giftVariantId: null,
    giftLabel: null,
  }));
  const campaign = { isActive: true, startsAt: start, tiers };

  it("follows the site mode outside pre-orders", () => {
    expect(storefrontStateOf("LIVE", campaign, start)).toBe("LIVE");
    expect(storefrontStateOf("WAITLIST", campaign, start)).toBe("WAITLIST");
  });

  it("is open only while a lap runs", () => {
    const mid = new Date(start.getTime() + 3 * DAY);
    expect(storefrontStateOf("PREORDERS", campaign, mid)).toBe("PREORDER_OPEN");
    expect(
      storefrontStateOf("PREORDERS", campaign, new Date(start.getTime() - DAY)),
    ).toBe("PREORDER_SOON");
    expect(
      storefrontStateOf(
        "PREORDERS",
        campaign,
        new Date(start.getTime() + 14 * DAY),
      ),
    ).toBe("PREORDER_CLOSED");
  });

  it("is closed with no campaign or a switched-off one", () => {
    expect(storefrontStateOf("PREORDERS", null, start)).toBe("PREORDER_CLOSED");
    expect(
      storefrontStateOf("PREORDERS", { ...campaign, isActive: false }, start),
    ).toBe("PREORDER_CLOSED");
  });
});
