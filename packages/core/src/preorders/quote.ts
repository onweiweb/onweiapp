import { prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import { resolveCoupons, type CodeCheck } from "../commerce/couponEligibility";
import {
  getCustomerIdentity,
  getInsiderStatus,
  type CustomerIdentity,
  type InsiderStatus,
} from "../commerce/customerIdentity";
import { getStoreSettings } from "../commerce/storeSettings";
import { variantLabelOf } from "../commerce/variantLabel";
import { getInsiderStackMode } from "../insiders/insiderTiers";
import { priceCart, type PricingResult } from "../pricing/engine";
import { getStorefront } from "./storefront";
import {
  getActivePreorderCampaign,
  liveTier,
  type PreorderCampaignView,
  type PreorderTierView,
} from "./campaign";

/**
 * What a pre-order costs: the tier discount, the Insider discount (added on
 * top or bigger one wins, as set in admin), any coupon allowed on pre-orders,
 * the free mystery box and Insider gift, and the split between what is paid
 * now (the reserve, per item) and the balance paid when stock is ready.
 * Same engine as the cart, so the numbers always agree.
 */

export const MAX_PREORDER_QUANTITY = 10;

export interface PreorderGift {
  variantId: string;
  quantity: number;
  /** Shown to the customer, e.g. "Tier 1 mystery box". */
  reason: string;
  /** Product name and size. */
  itemLabel: string;
}

export interface PreorderQuote {
  campaign: PreorderCampaignView;
  tier: PreorderTierView;
  product: {
    id: string;
    name: string;
    slug: string;
    variantId: string;
    variantLabel: string;
    sku: string;
    imageUrl: string | null;
    unitPrice: number;
    gstRate: number | null;
    isReturnable: boolean;
    categoryId: string;
  };
  quantity: number;
  pricing: PricingResult;
  /** Paise, paid now: the reserve per item, never more than the item costs. */
  reserveTotal: number;
  /** Paise, paid when stock is ready. */
  balanceDue: number;
  gifts: PreorderGift[];
  codes: CodeCheck[];
  insider: { code: string; percent: number } | null;
}

export type PreorderQuoteResult =
  | { ok: true; quote: PreorderQuote }
  | {
      ok: false;
      reason: "NOT_OPEN" | "NOT_AVAILABLE" | "INVALID_QUANTITY";
    };

/** Paid now: reserve per item, capped at what the items cost after discounts. */
export function splitReserve(input: {
  reservePerItem: number;
  quantity: number;
  merchandiseTotal: number;
  total: number;
}): { reserveTotal: number; balanceDue: number } {
  const reserveTotal = Math.min(
    input.reservePerItem * input.quantity,
    input.merchandiseTotal,
  );
  return { reserveTotal, balanceDue: input.total - reserveTotal };
}

async function giftLabel(variantId: string): Promise<string | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { name: true } } },
  });
  if (!variant) return null;
  const label = variantLabelOf(variant.attributes);
  return label ? `${variant.product.name} (${label})` : variant.product.name;
}

export async function quotePreorder(input: {
  variantId: string;
  quantity: number;
  customerId: string | null;
  codes?: readonly string[];
  now?: Date;
  /** Already loaded by the caller. */
  identity?: CustomerIdentity | null;
  insider?: InsiderStatus | null;
}): Promise<PreorderQuoteResult> {
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > MAX_PREORDER_QUANTITY
  )
    return { ok: false, reason: "INVALID_QUANTITY" };

  // Reserving works only while the site is in pre-order mode and a lap runs.
  const storefront = await getStorefront(input.now);
  if (storefront.state !== "PREORDER_OPEN")
    return { ok: false, reason: "NOT_OPEN" };
  const campaign = await getActivePreorderCampaign();
  const tier = campaign ? liveTier(campaign, input.now) : null;
  if (!campaign || !tier) return { ok: false, reason: "NOT_OPEN" };

  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      product: {
        include: {
          category: { select: { isReturnable: true } },
          images: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (
    !variant ||
    variant.status !== "ACTIVE" ||
    variant.product.status !== "ACTIVE" ||
    variant.product.deletedAt ||
    variant.product.giftOnly ||
    !campaign.productIds.includes(variant.productId)
  )
    return { ok: false, reason: "NOT_AVAILABLE" };

  const identity =
    input.identity !== undefined
      ? input.identity
      : input.customerId
        ? await getCustomerIdentity(input.customerId)
        : null;
  const insider =
    input.insider !== undefined
      ? input.insider
      : identity
        ? await getInsiderStatus(identity)
        : null;
  const [settings, insiderMode, resolved] = await Promise.all([
    getStoreSettings(),
    getInsiderStackMode(),
    resolveCoupons({ codes: input.codes ?? [], identity, insider }),
  ]);

  const unitPrice = toMinorUnits(variant.price);
  const pricing = priceCart({
    lines: [
      {
        key: variant.id,
        productId: variant.productId,
        categoryId: variant.product.categoryId,
        unitPrice,
        // Pre-order price is the tier price: no "on sale" from compare-at.
        compareAtPrice: null,
        quantity: input.quantity,
      },
    ],
    insider: insider ? { percent: insider.percent } : null,
    insiderMode,
    orderKind: "PREORDER",
    preorder: {
      percent: tier.percent,
      label: `${tier.label}, ${tier.percent}% off`,
    },
    coupons: resolved.coupons,
    paymentMethod: "RAZORPAY",
    shipping: {
      freeThreshold: settings.freeShippingThreshold,
      fee: settings.deliveryFee,
    },
    codFee: 0,
  });

  const gifts: PreorderGift[] = [];
  if (tier.giftVariantId) {
    const label = await giftLabel(tier.giftVariantId);
    if (label)
      gifts.push({
        variantId: tier.giftVariantId,
        quantity: input.quantity,
        reason: tier.giftLabel?.trim() || `${tier.label} mystery box`,
        itemLabel: label,
      });
  }
  if (insider && campaign.insiderGiftVariantId) {
    const label = await giftLabel(campaign.insiderGiftVariantId);
    if (label)
      gifts.push({
        variantId: campaign.insiderGiftVariantId,
        quantity: 1,
        reason: "Insider gift",
        itemLabel: label,
      });
  }
  for (const free of pricing.freeItems) {
    gifts.push({
      variantId: free.variantId,
      quantity: free.quantity,
      reason: `Free with ${free.code}`,
      itemLabel: free.itemLabel,
    });
  }

  const split = splitReserve({
    reservePerItem: campaign.reserveAmount,
    quantity: input.quantity,
    merchandiseTotal: pricing.merchandiseTotal,
    total: pricing.total,
  });

  const own = variant.images.find((i) => !i.isPlaceholder);
  const productImage = variant.product.images.find((i) => !i.isPlaceholder);
  return {
    ok: true,
    quote: {
      campaign,
      tier,
      product: {
        id: variant.productId,
        name: variant.product.name,
        slug: variant.product.slug,
        variantId: variant.id,
        variantLabel: variantLabelOf(variant.attributes),
        sku: variant.sku,
        imageUrl: own?.url ?? productImage?.url ?? null,
        unitPrice,
        gstRate: variant.product.gstRate
          ? Number(variant.product.gstRate)
          : null,
        isReturnable:
          variant.product.isReturnable && variant.product.category.isReturnable,
        categoryId: variant.product.categoryId,
      },
      quantity: input.quantity,
      pricing,
      reserveTotal: split.reserveTotal,
      balanceDue: split.balanceDue,
      gifts,
      codes: resolved.checks,
      insider: insider
        ? { code: insider.code, percent: insider.percent }
        : null,
    },
  };
}
