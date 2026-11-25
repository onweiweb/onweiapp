import { prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import { getStoreSettings } from "../commerce/storeSettings";
import { variantLabelOf } from "../commerce/variantLabel";
import {
  getInsiderDefaultPercent,
  getInsiderStackMode,
  type InsiderStackMode,
} from "../insiders/insiderTiers";
import { priceCart } from "../pricing/engine";
import { reserveForBag, type ReserveSettings } from "./rules";

export { insiderExtraText } from "./journeyText";

/**
 * The "Pre-order journey" table in admin: what each tier gives, what
 * Insiders get on top, and what a customer pays for one product. Uses the
 * same pricing engine as checkout, with the form's unsaved tiers, so staff
 * see the effect of an edit before saving.
 */

export interface JourneyTierInput {
  label: string;
  percent: number;
}

export interface JourneyPrice {
  /** Paise, for one item. */
  total: number;
  /** Paise, included in total (free above the store's threshold). */
  shippingFee: number;
  reserveTotal: number;
  balanceDue: number;
}

export interface JourneyPreview {
  productName: string;
  /** Normal price of one item, paise. */
  price: number;
  insiderPercent: number;
  insiderMode: InsiderStackMode;
  tiers: { label: string; everyone: JourneyPrice; insider: JourneyPrice }[];
}

export async function previewPreorderJourney(input: {
  variantId: string;
  tiers: JourneyTierInput[];
  /** Paise, from the unsaved form. */
  reserve: ReserveSettings;
}): Promise<JourneyPreview | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: true },
  });
  if (!variant) return null;
  const [settings, insiderMode, insiderPercent] = await Promise.all([
    getStoreSettings(),
    getInsiderStackMode(),
    getInsiderDefaultPercent(),
  ]);
  const price = toMinorUnits(variant.price);

  function priceFor(tier: JourneyTierInput, insider: boolean): JourneyPrice {
    const pricing = priceCart({
      lines: [
        {
          key: variant!.id,
          productId: variant!.productId,
          categoryId: variant!.product.categoryId,
          unitPrice: price,
          compareAtPrice: null,
          quantity: 1,
        },
      ],
      insider: insider ? { percent: insiderPercent } : null,
      insiderMode,
      orderKind: "PREORDER",
      preorder: { percent: tier.percent, label: tier.label },
      coupons: [],
      paymentMethod: "RAZORPAY",
      shipping: {
        freeThreshold: settings.freeShippingThreshold,
        fee: settings.deliveryFee,
      },
      codFee: 0,
    });
    const split = reserveForBag(input.reserve, {
      productTotal: pricing.subtotal,
      total: pricing.total,
    });
    return {
      total: pricing.total,
      shippingFee: pricing.shippingFee,
      ...split,
    };
  }

  const label = variantLabelOf(variant.attributes);
  return {
    productName: label
      ? `${variant.product.name} (${label})`
      : variant.product.name,
    price,
    insiderPercent,
    insiderMode,
    tiers: input.tiers.map((tier) => ({
      label: tier.label,
      everyone: priceFor(tier, false),
      insider: priceFor(tier, true),
    })),
  };
}
