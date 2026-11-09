import { z } from "zod";

const optionalNumber = z.number().nullable();

export const couponDraftSchema = z.object({
  code: z.string().max(40),
  description: z.string().max(120).nullable(),
  isActive: z.boolean(),
  give: z.discriminatedUnion("type", [
    z.object({ type: z.literal("PERCENTAGE"), percent: z.number() }),
    z.object({ type: z.literal("FLAT"), amount: z.number() }),
    z.object({
      type: z.literal("BUY_X_GET_Y"),
      buyQty: z.number(),
      getQty: z.number(),
    }),
    z.object({
      type: z.literal("TIERED"),
      tiers: z
        .array(z.object({ minSubtotal: z.number(), percent: z.number() }))
        .max(5),
    }),
    z.object({ type: z.literal("FREE_SHIPPING") }),
  ]),
  maxDiscount: optionalNumber,
  scope: z.enum(["CART", "CATEGORIES", "PRODUCTS"]),
  categoryIds: z.array(z.string().max(64)).max(200),
  productIds: z.array(z.string().max(64)).max(500),
  excludeSaleItems: z.boolean(),
  audience: z.enum(["EVERYONE", "FIRST_ORDER", "INSIDERS", "SPECIFIC"]),
  allowedContacts: z.array(z.string().max(254)).max(1000),
  minOrderValue: optionalNumber,
  minItems: optionalNumber,
  usageLimit: optionalNumber,
  perCustomerLimit: optionalNumber,
  startsAt: z.string().max(20).nullable(),
  endsAt: z.string().max(20).nullable(),
  autoApply: z.boolean(),
  combinableWithCoupons: z.boolean(),
  combinableWithInsider: z.boolean(),
  prepaidOnly: z.boolean(),
  priority: z.number(),
});
