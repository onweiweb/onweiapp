import type { DiscountType } from "@onwei/database";

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Percentage off",
  FLAT: "Flat amount off",
  BUY_X_GET_Y: "Buy X, get Y",
  TIERED: "Spend more, save more",
  FREE_SHIPPING: "Free delivery",
};

export function describeDiscountRule(
  type: DiscountType,
  config: Record<string, unknown>,
): string {
  switch (type) {
    case "PERCENTAGE":
      return `${config.percentage}% off`;
    case "FLAT":
      return `₹${config.amount} off`;
    case "BUY_X_GET_Y":
      return `Buy ${config.buyQty}, get ${config.getQty} free`;
    case "TIERED":
      return "Spend more, save more";
    case "FREE_SHIPPING":
      return "Free delivery";
  }
}
