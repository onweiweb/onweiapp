import { z } from "zod";

export const rewardSchema = z.object({
  invites: z.number({ error: "Enter how many invites." }),
  rewardType: z.enum(["AMOUNT_OFF", "PERCENT_OFF", "FREE_ITEM"]),
  value: z.number().nullable(),
  freeVariantId: z.string().max(64).nullable(),
  validDays: z.number({ error: "Enter how many days it lasts." }),
  isActive: z.boolean(),
});
