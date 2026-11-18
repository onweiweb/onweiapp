import { prisma, type Prisma } from "@onwei/database";
import { toMinorUnits } from "../catalog/helpers";
import { variantLabelOf } from "./variantLabel";
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

export const couponInclude = {
  rules: { orderBy: [{ priority: "desc" }, { id: "asc" }] },
} satisfies Prisma.CouponInclude;

type CouponWithRules = Prisma.CouponGetPayload<{
  include: typeof couponInclude;
}>;

/** What a free item coupon gives: price, name and whether it's in stock. */
export interface FreeItemInfo {
  value: number;
  itemLabel: string;
  available: boolean;
}

/** Looks up the free items of these coupons in one query. */
export async function loadFreeItemInfo(
  coupons: readonly { rules: { type: string; config: Prisma.JsonValue }[] }[],
): Promise<Map<string, FreeItemInfo>> {
  const ids = new Set<string>();
  for (const coupon of coupons) {
    const rule = coupon.rules[0];
    if (rule?.type !== "FREE_ITEM") continue;
    const id = (rule.config as { variantId?: unknown } | null)?.variantId;
    if (typeof id === "string") ids.add(id);
  }
  const out = new Map<string, FreeItemInfo>();
  if (ids.size === 0) return out;
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...ids] } },
    include: { inventory: true, product: { select: { name: true } } },
  });
  for (const variant of variants) {
    const stock = variant.inventory.reduce(
      (sum, row) =>
        sum + Math.max(0, row.quantityOnHand - row.quantityReserved),
      0,
    );
    const label = variantLabelOf(variant.attributes);
    out.set(variant.id, {
      value: toMinorUnits(variant.price),
      itemLabel: label
        ? `${variant.product.name} (${label})`
        : variant.product.name,
      available: stock > 0,
    });
  }
  return out;
}

function giveFrom(
  coupon: CouponWithRules,
  freeItems?: Map<string, FreeItemInfo>,
): DiscountGive | null {
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
    case "FREE_ITEM": {
      const variantId = String(config.variantId);
      const info = freeItems?.get(variantId);
      if (!info) return null;
      return {
        type: "FREE_ITEM",
        variantId,
        quantity: Number(config.quantity),
        value: info.value,
        itemLabel: info.itemLabel,
        available: info.available,
      };
    }
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
    case "FREE_ITEM":
      return give.quantity > 1
        ? `${give.quantity} free ${give.itemLabel}`
        : `Free ${give.itemLabel}`;
  }
}

export function toPricingCoupon(
  coupon: CouponWithRules,
  source: "code" | "auto",
  freeItems?: Map<string, FreeItemInfo>,
  /** Personal credit: paise still left on it. */
  creditLeft?: number,
): PricingCoupon | null {
  let give = giveFrom(coupon, freeItems);
  if (!give) return null;
  if (coupon.kind === "CREDIT" && give.type === "FLAT") {
    if (creditLeft === undefined || creditLeft <= 0) return null;
    give = { type: "FLAT", amount: Math.min(give.amount, creditLeft) };
  }
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
    prepaidOnly: coupon.prepaidOnly,
    appliesTo: coupon.appliesTo,
    isCredit: coupon.kind === "CREDIT",
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

/**
 * What is left on a personal credit: its amount minus what orders have used
 * (held for an unpaid order, or paid). A leftover stays for the next order.
 */
export async function creditLeftOn(
  coupon: Pick<CouponWithRules, "id" | "rules">,
): Promise<number> {
  const rule = coupon.rules[0];
  const amount = Math.round(
    Number((rule?.config as { amount?: unknown } | null)?.amount ?? 0) * 100,
  );
  const used = await prisma.couponRedemption.aggregate({
    where: { couponId: coupon.id, status: COUNTED },
    _sum: { discountAmount: true },
  });
  const spent = used._sum.discountAmount
    ? toMinorUnits(used._sum.discountAmount)
    : 0;
  return Math.max(0, amount - spent);
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
    const pricing = toPricingCoupon(
      coupon,
      "code",
      await loadFreeItemInfo([coupon]),
      coupon.kind === "CREDIT" ? await creditLeftOn(coupon) : undefined,
    );
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
  const autoFreeItems = await loadFreeItemInfo(autos);
  for (const coupon of autos) {
    if (coupons.some((c) => c.id === coupon.id)) continue;
    if (await audienceProblem(coupon, input.identity, input.insider)) continue;
    if (await usageProblem(coupon, input.identity)) continue;
    const pricing = toPricingCoupon(coupon, "auto", autoFreeItems);
    if (pricing) coupons.push(pricing);
  }

  return { coupons, checks, insiderCodeEntered };
}
