import { prisma, type Prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import { validateDiscountRuleConfig } from "../discounts/discountRuleConfig";
import { isInsiderCodeFormat, normalizeCode } from "../insiders/insiderCode";
import type { DiscountGive, PricingCoupon } from "../pricing/engine";
import {
  countPlacedOrders,
  type CustomerIdentity,
  type InsiderStatus,
} from "./customerIdentity";

/**
 * Turns codes a customer typed (plus automatic offers) into coupons the
 * pricing engine can use, after every check that needs the database: dates,
 * on/off, total uses, uses per person, who it's for. Cart conditions (minimum
 * value, items, combining) are the engine's job.
 *
 * Coupon safety rule 9: an unknown, expired, switched-off or used-up code all
 * get the same NOT_VALID answer, so nobody can tell which codes exist.
 */

export type CodeProblem =
  | "NOT_VALID"
  | "SIGN_IN_REQUIRED"
  | "FIRST_ORDER_ONLY"
  | "INSIDERS_ONLY"
  | "ALREADY_USED"
  | "INSIDER_CODE_NOT_YOURS"
  | "INSIDER_SIGN_IN";

export interface CodeCheck {
  code: string;
  /** Set when the code is the customer's own Insider code. */
  isInsiderCode?: boolean;
  problem?: CodeProblem;
}

const CODE_PATTERN = /^[A-Z0-9-]{3,30}$/;

const couponInclude = {
  rules: { orderBy: [{ priority: "desc" }, { id: "asc" }] },
} satisfies Prisma.CouponInclude;

type CouponWithRules = Prisma.CouponGetPayload<{
  include: typeof couponInclude;
}>;

function giveFrom(coupon: CouponWithRules): DiscountGive | null {
  const rule = coupon.rules[0];
  if (!rule) return null;
  const checked = validateDiscountRuleConfig(rule.type, rule.config);
  if (!checked.ok) return null;
  const config = checked.data as Record<string, unknown>;
  switch (rule.type) {
    case "PERCENTAGE":
      return { type: "PERCENTAGE", percent: Number(config.percentage) };
    case "FLAT":
      return { type: "FLAT", amount: Math.round(Number(config.amount) * 100) };
    case "BUY_X_GET_Y":
      return {
        type: "BUY_X_GET_Y",
        buyQty: Number(config.buyQty),
        getQty: Number(config.getQty),
      };
    case "TIERED":
      return {
        type: "TIERED",
        tiers: (config.tiers as { minSubtotal: number; percent: number }[]).map(
          (tier) => ({
            minSubtotal: Math.round(tier.minSubtotal * 100),
            percent: tier.percent,
          }),
        ),
      };
    case "FREE_SHIPPING":
      return { type: "FREE_SHIPPING" };
  }
}

/** Short customer-facing name for a coupon, e.g. "SAVE10 (10% off)". */
export function describeGive(give: DiscountGive): string {
  switch (give.type) {
    case "PERCENTAGE":
      return `${give.percent}% off`;
    case "FLAT":
      return `₹${(give.amount / 100).toLocaleString("en-IN")} off`;
    case "BUY_X_GET_Y":
      return `Buy ${give.buyQty}, get ${give.getQty} free`;
    case "TIERED":
      return "Spend more, save more";
    case "FREE_SHIPPING":
      return "Free delivery";
  }
}

export function toPricingCoupon(
  coupon: CouponWithRules,
  source: "code" | "auto",
): PricingCoupon | null {
  const give = giveFrom(coupon);
  if (!give) return null;
  return {
    id: coupon.id,
    code: coupon.code.toUpperCase(),
    label:
      coupon.description?.trim() ||
      `${coupon.code.toUpperCase()} (${describeGive(give)})`,
    give,
    maxDiscount: coupon.maxDiscount ? toMinorUnits(coupon.maxDiscount) : null,
    scope: coupon.scope,
    categoryIds: coupon.categoryIds,
    productIds: coupon.productIds,
    excludeSaleItems: coupon.excludeSaleItems,
    minOrderValue: coupon.minOrderValue
      ? toMinorUnits(coupon.minOrderValue)
      : null,
    minItems: coupon.minItems,
    combinableWithCoupons: coupon.combinableWithCoupons,
    combinableWithInsider: coupon.combinableWithInsider,
    prepaidOnly: coupon.prepaidOnly,
    priority: coupon.priority,
    createdAt: coupon.createdAt.getTime(),
    source,
  };
}

function liveNow(coupon: CouponWithRules, now: Date): boolean {
  if (!coupon.isActive) return false;
  if (coupon.startsAt && coupon.startsAt > now) return false;
  if (coupon.endsAt && coupon.endsAt <= now) return false;
  return true;
}

/** Uses that count: held for an unpaid order, or confirmed. */
const COUNTED = {
  in: ["RESERVED", "CONFIRMED"] as ("RESERVED" | "CONFIRMED")[],
};

export async function countCouponUses(couponId: string): Promise<number> {
  return prisma.couponRedemption.count({
    where: { couponId, status: COUNTED },
  });
}

export async function countCouponUsesBy(
  couponId: string,
  identity: Pick<CustomerIdentity, "id" | "email" | "phone">,
): Promise<number> {
  const or: Prisma.CouponRedemptionWhereInput[] = [{ customerId: identity.id }];
  if (identity.email) or.push({ customerEmail: identity.email });
  if (identity.phone) or.push({ customerPhone: identity.phone });
  return prisma.couponRedemption.count({
    where: { couponId, status: COUNTED, OR: or },
  });
}

async function audienceProblem(
  coupon: CouponWithRules,
  identity: CustomerIdentity | null,
  insider: InsiderStatus | null,
): Promise<CodeProblem | null> {
  switch (coupon.audience) {
    case "EVERYONE":
      return null;
    case "FIRST_ORDER":
      if (!identity) return "SIGN_IN_REQUIRED";
      return (await countPlacedOrders(identity)) > 0
        ? "FIRST_ORDER_ONLY"
        : null;
    case "INSIDERS":
      if (!identity) return "SIGN_IN_REQUIRED";
      return insider ? null : "INSIDERS_ONLY";
    case "SPECIFIC": {
      if (!identity) return "SIGN_IN_REQUIRED";
      const allowed = new Set(
        coupon.allowedContacts.map((c) => c.toLowerCase()),
      );
      const mine = [identity.email, identity.phone].filter(Boolean) as string[];
      return mine.some((contact) => allowed.has(contact.toLowerCase()))
        ? null
        : "NOT_VALID";
    }
  }
}

async function usageProblem(
  coupon: CouponWithRules,
  identity: CustomerIdentity | null,
): Promise<CodeProblem | null> {
  if (
    coupon.usageLimit !== null &&
    (await countCouponUses(coupon.id)) >= coupon.usageLimit
  ) {
    return "NOT_VALID";
  }
  if (coupon.perCustomerLimit !== null && identity) {
    if (
      (await countCouponUsesBy(coupon.id, identity)) >= coupon.perCustomerLimit
    ) {
      return "ALREADY_USED";
    }
  }
  return null;
}

export interface EligibleCoupons {
  coupons: PricingCoupon[];
  checks: CodeCheck[];
  /** The customer typed their own Insider code. */
  insiderCodeEntered: boolean;
}

export async function resolveCoupons(input: {
  codes: readonly string[];
  identity: CustomerIdentity | null;
  insider: InsiderStatus | null;
  now?: Date;
}): Promise<EligibleCoupons> {
  const now = input.now ?? new Date();
  const coupons: PricingCoupon[] = [];
  const checks: CodeCheck[] = [];
  let insiderCodeEntered = false;
  const seen = new Set<string>();

  for (const raw of input.codes) {
    const code = normalizeCode(raw);
    if (seen.has(code)) continue;
    seen.add(code);

    if (isInsiderCodeFormat(code)) {
      if (!input.identity) {
        checks.push({ code, isInsiderCode: true, problem: "INSIDER_SIGN_IN" });
      } else if (input.insider?.code === code) {
        insiderCodeEntered = true;
        checks.push({ code, isInsiderCode: true });
      } else {
        checks.push({
          code,
          isInsiderCode: true,
          problem: "INSIDER_CODE_NOT_YOURS",
        });
      }
      continue;
    }

    if (!CODE_PATTERN.test(code)) {
      checks.push({ code, problem: "NOT_VALID" });
      continue;
    }
    const coupon = await prisma.coupon.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      include: couponInclude,
    });
    if (!coupon || !liveNow(coupon, now)) {
      checks.push({ code, problem: "NOT_VALID" });
      continue;
    }
    const problem =
      (await audienceProblem(coupon, input.identity, input.insider)) ??
      (await usageProblem(coupon, input.identity));
    const pricing = toPricingCoupon(coupon, "code");
    if (problem || !pricing) {
      checks.push({ code, problem: problem ?? "NOT_VALID" });
      continue;
    }
    coupons.push(pricing);
    checks.push({ code });
  }

  // Automatic offers: silently skipped when they don't apply.
  const autos = await prisma.coupon.findMany({
    where: {
      autoApply: true,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    include: couponInclude,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 20,
  });
  for (const coupon of autos) {
    if (coupons.some((c) => c.id === coupon.id)) continue;
    if (await audienceProblem(coupon, input.identity, input.insider)) continue;
    if (await usageProblem(coupon, input.identity)) continue;
    const pricing = toPricingCoupon(coupon, "auto");
    if (pricing) coupons.push(pricing);
  }

  return { coupons, checks, insiderCodeEntered };
}
