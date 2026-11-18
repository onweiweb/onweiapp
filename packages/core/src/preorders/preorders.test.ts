import { describe, expect, it } from "vitest";
import {
  liveTier,
  tierState,
  tierWindows,
  validatePreorderCampaign,
  type PreorderCampaignInput,
} from "./campaign";
import { splitReserve } from "./quote";
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

describe("reserve split", () => {
  it("takes the reserve per item and leaves the rest as balance", () => {
    expect(
      splitReserve({
        reservePerItem: 90000,
        quantity: 2,
        merchandiseTotal: 680000,
        total: 680000,
      }),
    ).toEqual({ reserveTotal: 180000, balanceDue: 500000 });
  });

  it("never asks for more than the items cost", () => {
    expect(
      splitReserve({
        reservePerItem: 90000,
        quantity: 1,
        merchandiseTotal: 50000,
        total: 59900,
      }),
    ).toEqual({ reserveTotal: 50000, balanceDue: 9900 });
  });
});

describe("campaign form checks", () => {
  const good: PreorderCampaignInput = {
    name: "Launch pre-order",
    isActive: true,
    startDate: "2026-12-01",
    reserveAmount: 900,
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
      reserveAmount: 0,
      productIds: [],
      tiers: [{ ...good.tiers[0]!, days: 0 }],
    });
    expect(errors.name).toBeTruthy();
    expect(errors.reserveAmount).toBeTruthy();
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
