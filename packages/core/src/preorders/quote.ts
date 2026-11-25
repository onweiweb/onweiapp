import { prisma } from "@onwei/database";
import { variantLabelOf } from "../commerce/variantLabel";
import type { FreeItem } from "../pricing/engine";
import type { PreorderCampaignView, PreorderTierView } from "./campaign";

/**
 * The free items on a pre-order: the lap's mystery box (one per item), the
 * Insider gift (one per order) and free items from coupons. The price, the
 * reserve and the balance are worked out by the bag (`getCartView`), with
 * the same engine as every other order.
 */

export interface PreorderGift {
  variantId: string;
  quantity: number;
  /** Shown to the customer, e.g. "Lap 1 mystery box". */
  reason: string;
  /** Product name and size. */
  itemLabel: string;
}

async function giftLabels(variantIds: string[]): Promise<Map<string, string>> {
  if (variantIds.length === 0) return new Map();
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { name: true } } },
  });
  return new Map(
    variants.map((variant) => {
      const label = variantLabelOf(variant.attributes);
      return [
        variant.id,
        label ? `${variant.product.name} (${label})` : variant.product.name,
      ];
    }),
  );
}

export async function preorderGiftsFor(input: {
  campaign: Pick<PreorderCampaignView, "insiderGiftVariantId">;
  tier: Pick<PreorderTierView, "label" | "giftVariantId" | "giftLabel">;
  /** Paid items in the bag. */
  itemCount: number;
  /** The Insider discount is on for this bag. */
  insider: boolean;
  freeItems: readonly FreeItem[];
}): Promise<PreorderGift[]> {
  const ids = [
    input.tier.giftVariantId,
    input.insider ? input.campaign.insiderGiftVariantId : null,
  ].filter((id): id is string => Boolean(id));
  const labels = await giftLabels(ids);
  const gifts: PreorderGift[] = [];
  const box = input.tier.giftVariantId;
  if (box && labels.has(box) && input.itemCount > 0)
    gifts.push({
      variantId: box,
      quantity: input.itemCount,
      reason: input.tier.giftLabel?.trim() || `${input.tier.label} mystery box`,
      itemLabel: labels.get(box)!,
    });
  const insiderGift = input.campaign.insiderGiftVariantId;
  if (input.insider && insiderGift && labels.has(insiderGift))
    gifts.push({
      variantId: insiderGift,
      quantity: 1,
      reason: "Insider gift",
      itemLabel: labels.get(insiderGift)!,
    });
  for (const free of input.freeItems) {
    gifts.push({
      variantId: free.variantId,
      quantity: free.quantity,
      reason: `Free with ${free.code}`,
      itemLabel: free.itemLabel,
    });
  }
  return gifts;
}
