import type { PreorderCampaignInput } from "@onwei/core";

// The form's starting values when there is no campaign yet. In a plain module
// (not the "use client" form) because the Pre-order tab, a server component,
// calls it: a function from a client module can't run on the server.
export const DEFAULT_CAMPAIGN = (today: string): PreorderCampaignInput => ({
  name: "Launch pre-order",
  isActive: false,
  startDate: today,
  reserveLow: 500,
  reserveHigh: 900,
  reserveThreshold: 4000,
  nudgeDaysBeforeClose: 7,
  balanceDueDaysAfterClose: 7,
  expectedShipDate: null,
  productIds: [],
  insiderGiftVariantId: null,
  tiers: [
    {
      label: "Tier 1",
      days: 7,
      percent: 15,
      giftVariantId: null,
      giftLabel: "₹1,000 mystery box",
    },
    {
      label: "Tier 2",
      days: 7,
      percent: 10,
      giftVariantId: null,
      giftLabel: "₹500 mystery box",
    },
    {
      label: "Tier 3",
      days: 7,
      percent: 8,
      giftVariantId: null,
      giftLabel: "₹250 mystery box",
    },
  ],
});
