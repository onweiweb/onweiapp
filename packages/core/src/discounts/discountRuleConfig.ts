import { z } from "zod";
import type { DiscountType } from "@onwei/database";

/**
 * DiscountRule.config is a typed JSON field, validated per `type`, one zod
 * schema per type, per .claude/skills/discount-rule-engine/SKILL.md. Adding
 * a new discount type means adding a schema + branch here, never a new
 * nullable column on DiscountRule.
 */
export const percentageConfigSchema = z.object({
  percentage: z
    .number()
    .min(1, "Percentage must be between 1 and 100.")
    .max(100, "Percentage must be between 1 and 100."),
});

export const flatConfigSchema = z.object({
  amount: z.number().positive("Enter an amount greater than 0."),
});

export const buyXGetYConfigSchema = z.object({
  buyQty: z.number().int().min(1, "Buy quantity must be at least 1."),
  getQty: z.number().int().min(1, "Free quantity must be at least 1."),
});

/** Amounts in rupees. Each tier: spend at least minSubtotal, get percent off. */
export const tieredConfigSchema = z.object({
  tiers: z
    .array(
      z.object({
        minSubtotal: z
          .number()
          .positive("Each step needs a cart value above 0."),
        percent: z
          .number()
          .int("Use whole percentages.")
          .min(1, "Percentage must be between 1 and 90.")
          .max(90, "Percentage must be between 1 and 90."),
      }),
    )
    .min(1, "Add at least one step.")
    .max(5, "Use at most five steps.")
    .refine(
      (tiers) =>
        new Set(tiers.map((tier) => tier.minSubtotal)).size === tiers.length,
      "Each step needs a different cart value.",
    ),
});

export const freeShippingConfigSchema = z.object({});

export type PercentageConfig = z.infer<typeof percentageConfigSchema>;
export type TieredConfig = z.infer<typeof tieredConfigSchema>;
export type FlatConfig = z.infer<typeof flatConfigSchema>;
export type BuyXGetYConfig = z.infer<typeof buyXGetYConfigSchema>;

export type ValidateConfigResult =
  { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/** Validates a discount rule's config against the zod schema for its type. */
export function validateDiscountRuleConfig(
  type: DiscountType,
  config: unknown,
): ValidateConfigResult {
  const schema =
    type === "PERCENTAGE"
      ? percentageConfigSchema
      : type === "FLAT"
        ? flatConfigSchema
        : type === "BUY_X_GET_Y"
          ? buyXGetYConfigSchema
          : type === "TIERED"
            ? tieredConfigSchema
            : freeShippingConfigSchema;

  const result = schema.safeParse(config);
  if (!result.success) {
    return {
      ok: false,
      error:
        result.error.issues[0]?.message ?? "Invalid discount configuration.",
    };
  }
  return { ok: true, data: result.data };
}
