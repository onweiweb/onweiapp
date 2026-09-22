import type { DiscountType } from "@onwei/database";

export interface CreateCouponInput {
  code: string;
  description?: string | null;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  minOrderValue?: number | null;
}

export type UpdateCouponInput = Partial<CreateCouponInput>;

export interface CreateDiscountRuleInput {
  type: DiscountType;
  config: Record<string, unknown>;
  priority?: number;
  stackable?: boolean;
}

export type UpdateDiscountRuleInput = Partial<CreateDiscountRuleInput>;
