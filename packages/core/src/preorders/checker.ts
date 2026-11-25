import { prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import {
  couponInclude,
  creditLeftOn,
  loadFreeItemInfo,
  toPricingCoupon,
} from "../commerce/couponEligibility";
import { getStoreSettings } from "../commerce/storeSettings";
import { variantLabelOf } from "../commerce/variantLabel";
import {
  getInsiderDefaultPercent,
  getInsiderStackMode,
} from "../insiders/insiderTiers";
import { normalizeCode } from "../insiders/insiderCode";
import {
  priceCart,
  type PricingCoupon,
  type PricingResult,
} from "../pricing/engine";
import { getPreorderCampaignForAdmin, liveTier } from "./campaign";
import { reserveForBag } from "./rules";

/**
 * The admin price checker: "what would this customer pay?" for one product,
 * with or without the Insider discount, as a normal order or a pre-order,
 * with any codes. Same engine as checkout. Codes are looked up as they are
 * (paused, ended or limited ones still show), so staff can try a coupon
 * before switching it on; who the coupon is for is not checked.
 */

export interface PriceCheckInput {
  variantId: string;
  quantity: number;
  insider: boolean;
  preorder: boolean;
  codes: string[];
}

export type PriceCheckResult =
  | {
      ok: true;
      productName: string;
      insiderPercent: number;
      insiderMode: "ADD" | "BEST";
      tier: { label: string; percent: number } | null;
      pricing: PricingResult;
      reserve: { reserveTotal: number; balanceDue: number } | null;
      unknownCodes: string[];
      pausedCodes: string[];
    }
  | { ok: false; reason: "NOT_FOUND" | "NO_CAMPAIGN" };

export async function checkPrice(
  input: PriceCheckInput,
): Promise<PriceCheckResult> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: true },
  });
  if (!variant) return { ok: false, reason: "NOT_FOUND" };

  const [settings, insiderMode, insiderPercent, campaign] = await Promise.all([
    getStoreSettings(),
    getInsiderStackMode(),
    getInsiderDefaultPercent(),
    input.preorder ? getPreorderCampaignForAdmin() : Promise.resolve(null),
  ]);
  if (input.preorder && (!campaign || campaign.tiers.length === 0))
    return { ok: false, reason: "NO_CAMPAIGN" };
  const tier = campaign
    ? (liveTier({ ...campaign, isActive: true }) ?? campaign.tiers[0]!)
    : null;

  const codes = [...new Set(input.codes.map(normalizeCode).filter(Boolean))];
  const rows = codes.length
    ? await prisma.coupon.findMany({
        where: {
          OR: codes.map((code) => ({
            code: { equals: code, mode: "insensitive" as const },
          })),
        },
        include: couponInclude,
      })
    : [];
  const freeItems = await loadFreeItemInfo(rows);
  const coupons: PricingCoupon[] = [];
  const now = new Date();
  const pausedCodes: string[] = [];
  for (const row of rows) {
    const coupon = toPricingCoupon(
      row,
      "code",
      freeItems,
      row.kind === "CREDIT" ? await creditLeftOn(row) : undefined,
    );
    if (coupon) coupons.push(coupon);
    if (
      !row.isActive ||
      (row.startsAt && row.startsAt > now) ||
      (row.endsAt && row.endsAt <= now)
    )
      pausedCodes.push(row.code.toUpperCase());
  }
  const found = new Set(rows.map((r) => r.code.toUpperCase()));

  const pricing = priceCart({
    lines: [
      {
        key: variant.id,
        productId: variant.productId,
        categoryId: variant.product.categoryId,
        unitPrice: toMinorUnits(variant.price),
        compareAtPrice:
          input.preorder || !variant.compareAtPrice
            ? null
            : toMinorUnits(variant.compareAtPrice),
        quantity: input.quantity,
      },
    ],
    insider: input.insider ? { percent: insiderPercent } : null,
    insiderMode,
    orderKind: input.preorder ? "PREORDER" : "STANDARD",
    preorder: tier
      ? { percent: tier.percent, label: `${tier.label}, ${tier.percent}% off` }
      : null,
    coupons,
    paymentMethod: "RAZORPAY",
    shipping: {
      freeThreshold: settings.freeShippingThreshold,
      fee: settings.deliveryFee,
    },
    codFee: 0,
  });

  const label = variantLabelOf(variant.attributes);
  return {
    ok: true,
    productName: label
      ? `${variant.product.name} (${label})`
      : variant.product.name,
    insiderPercent,
    insiderMode,
    tier: tier ? { label: tier.label, percent: tier.percent } : null,
    pricing,
    reserve:
      campaign && input.preorder
        ? reserveForBag(campaign, {
            productTotal: pricing.subtotal,
            total: pricing.total,
          })
        : null,
    unknownCodes: codes.filter((c) => !found.has(c)),
    pausedCodes,
  };
}
