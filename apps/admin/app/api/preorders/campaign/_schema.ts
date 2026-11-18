import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().max(80),
  isActive: z.boolean(),
  startDate: z.string().max(10),
  reserveAmount: z.number({ error: "Enter the amount paid now, in rupees." }),
  expectedShipDate: z.string().max(10).nullable(),
  productIds: z.array(z.string().max(64)).max(200),
  insiderGiftVariantId: z.string().max(64).nullable(),
  tiers: z
    .array(
      z.object({
        label: z.string().max(40),
        days: z.number({ error: "Enter the number of days." }),
        percent: z.number({ error: "Enter the discount." }),
        giftVariantId: z.string().max(64).nullable(),
        giftLabel: z.string().max(60).nullable(),
      }),
    )
    .max(5, "Use at most five tiers."),
});
