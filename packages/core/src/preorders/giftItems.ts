import { toMinorUnits } from "../catalog/helpers";
import { prisma } from "@onwei/database";
import { variantLabelOf } from "../commerce/variantLabel";

export interface GiftableItem {
  /** The product size and colour (variant) id. */
  id: string;
  productId: string;
  name: string;
  stock: number;
  giftOnly: boolean;
  /** The item's price in paise: what a mystery box or gift is worth. */
  value: number;
}

/**
 * Every product size and colour that can be given free (mystery boxes, the
 * Insider gift, free item coupons): gift-only products first, then the rest.
 */
export async function listGiftableItems(): Promise<GiftableItem[]> {
  const variants = await prisma.productVariant.findMany({
    where: { status: "ACTIVE", product: { deletedAt: null } },
    include: {
      inventory: true,
      product: { select: { name: true, giftOnly: true } },
    },
  });
  return variants
    .map((variant) => {
      const label = variantLabelOf(variant.attributes);
      return {
        id: variant.id,
        productId: variant.productId,
        name: label
          ? `${variant.product.name} (${label})`
          : variant.product.name,
        stock: variant.inventory.reduce(
          (sum, row) =>
            sum + Math.max(0, row.quantityOnHand - row.quantityReserved),
          0,
        ),
        giftOnly: variant.product.giftOnly,
        value: toMinorUnits(variant.price),
      };
    })
    .sort(
      (a, b) =>
        Number(b.giftOnly) - Number(a.giftOnly) || a.name.localeCompare(b.name),
    );
}
