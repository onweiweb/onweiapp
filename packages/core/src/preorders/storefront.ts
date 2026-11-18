import { Prisma, prisma } from "@onwei/database";
import {
  getActivePreorderCampaign,
  liveTier,
  tierState,
  type PreorderCampaignView,
  type TierState,
} from "./campaign";

/**
 * One answer to "what can a shopper do right now", used by the cart, the
 * pre-order checkout, the product lists and the storefront buttons alike,
 * so the browser and the server never disagree.
 *
 * - LIVE: the normal shop.
 * - PREORDER_OPEN: pre-order mode and a lap is running. Only campaign
 *   products show, and they can be reserved.
 * - PREORDER_SOON: pre-order mode, the campaign starts later.
 * - PREORDER_CLOSED: pre-order mode with no campaign switched on, or the
 *   last lap has ended.
 * - WAITLIST: everything is behind the coming-soon page.
 *
 * In every PREORDER_* state the normal bag and checkout are closed.
 */
export type StorefrontState =
  "WAITLIST" | "LIVE" | "PREORDER_OPEN" | "PREORDER_SOON" | "PREORDER_CLOSED";

export interface Storefront {
  state: StorefrontState;
  /** True in every PREORDER_* state: the normal bag and checkout are shut. */
  preorderMode: boolean;
  /** Products the storefront lists in pre-order mode (empty otherwise). */
  campaignProductIds: string[];
  /** When the first lap opens, for PREORDER_SOON. */
  opensAt: Date | null;
}

type SiteModeValue = "WAITLIST" | "PREORDERS" | "LIVE";

export function storefrontStateOf(
  siteMode: SiteModeValue | null | undefined,
  campaign: Pick<
    PreorderCampaignView,
    "isActive" | "tiers" | "startsAt"
  > | null,
  now: Date = new Date(),
): StorefrontState {
  if (siteMode === "LIVE") return "LIVE";
  if (siteMode !== "PREORDERS") return "WAITLIST";
  if (!campaign || !campaign.isActive) return "PREORDER_CLOSED";
  if (liveTier(campaign, now)) return "PREORDER_OPEN";
  if (now < campaign.startsAt) return "PREORDER_SOON";
  return "PREORDER_CLOSED";
}

export async function getStorefront(
  now: Date = new Date(),
): Promise<Storefront> {
  const [setting, campaign] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { id: "singleton" },
      select: { siteMode: true },
    }),
    getActivePreorderCampaign(),
  ]);
  const state = storefrontStateOf(setting?.siteMode, campaign, now);
  const preorderMode = state.startsWith("PREORDER_");
  return {
    state,
    preorderMode,
    campaignProductIds: preorderMode ? (campaign?.productIds ?? []) : [],
    opensAt: state === "PREORDER_SOON" && campaign ? campaign.startsAt : null,
  };
}

/**
 * Which products the storefront lists. In pre-order mode only the
 * campaign's products show; a product page stays reachable by its link.
 */
export async function storefrontProductWhere(): Promise<Prisma.ProductWhereInput> {
  const base: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    giftOnly: false,
  };
  const storefront = await getStorefront();
  if (!storefront.preorderMode) return base;
  return { ...base, id: { in: storefront.campaignProductIds } };
}

/**
 * Whether the site can be switched to pre-order mode: a campaign must be
 * switched on with a lap running now or starting later.
 */
export async function canStartPreorderMode(
  now: Date = new Date(),
): Promise<boolean> {
  const campaign = await getActivePreorderCampaign();
  if (!campaign) return false;
  return now < campaign.endsAt;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PreorderPublicTier {
  label: string;
  percent: number;
  giftLabel: string | null;
  state: TierState;
  /** Day numbers, 1-based, e.g. 8 and 14. */
  firstDay: number;
  lastDay: number;
  startsAt: string;
  endsAt: string;
}

export interface PreorderPublicStatus {
  /** What shoppers can do right now (see `StorefrontState`). */
  state: StorefrontState;
  /** True only when a lap is running and Reserve works. */
  live: boolean;
  /** Paise, per item. */
  reserveAmount: number;
  /** Campaign products, in every pre-order state. */
  productIds: string[];
  tiers: PreorderPublicTier[];
  liveIndex: number;
  /** 1-based day of the campaign today, and its length in days. */
  day: number;
  totalDays: number;
  endsAt: string | null;
  /** When the first lap opens (PREORDER_SOON only). */
  opensAt: string | null;
  expectedShipDate: string | null;
}

/**
 * What the storefront shows: banner, pop-up, Reserve and the "opens at
 * launch" buttons all read this one answer.
 */
export async function getPreorderPublicStatus(
  now: Date = new Date(),
): Promise<PreorderPublicStatus> {
  const [campaign, setting] = await Promise.all([
    getActivePreorderCampaign(),
    prisma.siteSetting.findUnique({
      where: { id: "singleton" },
      select: { siteMode: true },
    }),
  ]);
  const state = storefrontStateOf(setting?.siteMode, campaign, now);
  const preorderMode = state.startsWith("PREORDER_");
  const empty: PreorderPublicStatus = {
    state,
    live: false,
    reserveAmount: 0,
    productIds: preorderMode ? (campaign?.productIds ?? []) : [],
    tiers: [],
    liveIndex: -1,
    day: 0,
    totalDays: 0,
    endsAt: null,
    opensAt:
      state === "PREORDER_SOON" && campaign
        ? campaign.startsAt.toISOString()
        : null,
    expectedShipDate: null,
  };
  const live = campaign ? liveTier(campaign, now) : null;
  if (state !== "PREORDER_OPEN" || !campaign || !live) return empty;
  let dayCursor = 1;
  const tiers = campaign.tiers.map((tier) => {
    const firstDay = dayCursor;
    dayCursor += tier.days;
    return {
      label: tier.label,
      percent: tier.percent,
      giftLabel: tier.giftLabel,
      state: tierState(tier, now),
      firstDay,
      lastDay: dayCursor - 1,
      startsAt: tier.startsAt.toISOString(),
      endsAt: tier.endsAt.toISOString(),
    };
  });
  return {
    ...empty,
    live: true,
    reserveAmount: campaign.reserveAmount,
    tiers,
    liveIndex: campaign.tiers.findIndex((t) => t.id === live.id),
    day: Math.floor((now.getTime() - campaign.startsAt.getTime()) / DAY_MS) + 1,
    totalDays: dayCursor - 1,
    endsAt: campaign.endsAt.toISOString(),
    expectedShipDate: campaign.expectedShipDate?.toISOString() ?? null,
  };
}
