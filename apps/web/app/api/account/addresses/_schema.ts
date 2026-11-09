import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().max(100),
  phone: z.string().max(20),
  line1: z.string().max(200),
  line2: z.string().max(200).optional(),
  city: z.string().max(80),
  state: z.string().max(80),
  postalCode: z.string().max(10),
  isDefault: z.boolean().optional(),
});
