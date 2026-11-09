import {
  Prisma,
  prisma,
  type CouponAudience,
  type CouponScope,
  type DiscountType,
} from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import { isValidEmail } from "../validation/email";
import { validatePhone } from "../validation/phone";
import { isInsiderCodeFormat, normalizeCode } from "../insiders/insiderCode";
import {
  priceCart,
  type DiscountGive,
  type PricingCoupon,
} from "../pricing/engine";
import { describeGive } from "./couponEligibility";

/**
 * The admin coupon builder: one form, one coupon, one "what it gives" rule.
 * Coupon safety rule 10: once a coupon has been used, the deal itself
 * (what it gives, its maximum, what it applies to, combine rules) is locked.
 * Dates, limits, on/off and the description stay editable; to change the
 * deal, duplicate it into a new coupon.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const CODE = /^[A-Z0-9-]{3,30}$/;

export interface CouponDraft {
  code: string;
  description: string | null;
  isActive: boolean;
  give:
    | { type: "PERCENTAGE"; percent: number }
    | { type: "FLAT"; amount: number }
    | { type: "BUY_X_GET_Y"; buyQty: number; getQty: number }
    | { type: "TIERED"; tiers: { minSubtotal: number; percent: number }[] }
    | { type: "FREE_SHIPPING" };
  /** Rupees, null for no maximum. */
  maxDiscount: number | null;
  scope: CouponScope;
  categoryIds: string[];
  productIds: string[];
  excludeSaleItems: boolean;
  audience: CouponAudience;
  /** Emails or phone numbers, one per entry, for audience SPECIFIC. */
  allowedContacts: string[];
  minOrderValue: number | null;
  minItems: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  /** "YYYY-MM-DDTHH:mm" in India time, or null. */
  startsAt: string | null;
  endsAt: string | null;
  autoApply: boolean;
  combinableWithCoupons: boolean;
  combinableWithInsider: boolean;
  prepaidOnly: boolean;
  priority: number;
}

export type DraftErrors = Partial<
  Record<keyof CouponDraft | "giveValue", string>
>;

/** "2026-11-20T09:30" (India time) to a UTC Date. */
export function istLocalToDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const utc = Date.parse(`${match[1]}T${match[2]}:${match[3]}:00Z`);
  return Number.isNaN(utc) ? null : new Date(utc - IST_OFFSET_MS);
}

export function dateToIstLocal(value: Date | null): string | null {
  if (!value) return null;
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

function normalizeContacts(raw: string[]): { ok: string[]; bad: string[] } {
  const ok: string[] = [];
  const bad: string[] = [];
  for (const entry of raw.map((r) => r.trim()).filter(Boolean)) {
    if (entry.includes("@")) {
      if (isValidEmail(entry.toLowerCase())) ok.push(entry.toLowerCase());
      else bad.push(entry);
    } else {
      const phone = validatePhone(entry, { allowInternational: true });
      if (phone.valid && phone.e164) ok.push(phone.e164);
      else bad.push(entry);
    }
  }
  return { ok: Array.from(new Set(ok)), bad };
}

const wholeAtLeast = (value: number | null, min: number) =>
  value === null || (Number.isInteger(value) && value >= min);

/** Checks a draft and explains each problem in plain words. */
export function validateCouponDraft(draft: CouponDraft): DraftErrors {
  const errors: DraftErrors = {};
  const code = normalizeCode(draft.code);
  if (!CODE.test(code))
    errors.code = "Use 3 to 30 letters, numbers or dashes, no spaces.";
  else if (isInsiderCodeFormat(code))
    errors.code =
      "Codes like WEI1234 are kept for Insider codes. Pick another.";

  const give = draft.give;
  if (
    give.type === "PERCENTAGE" &&
    !(Number.isInteger(give.percent) && give.percent >= 1 && give.percent <= 90)
  ) {
    errors.giveValue = "Enter a whole percentage from 1 to 90.";
  }
  if (give.type === "FLAT" && !(give.amount > 0 && give.amount <= 100000)) {
    errors.giveValue = "Enter an amount above ₹0.";
  }
  if (
    give.type === "BUY_X_GET_Y" &&
    !(
      wholeAtLeast(give.buyQty, 1) &&
      wholeAtLeast(give.getQty, 1) &&
      give.buyQty + give.getQty <= 20
    )
  ) {
    errors.giveValue = "Use whole numbers: buy at least 1, get at least 1.";
  }
  if (give.type === "TIERED") {
    const values = give.tiers.map((t) => t.minSubtotal);
    if (give.tiers.length < 1 || give.tiers.length > 5)
      errors.giveValue = "Add one to five steps.";
    else if (
      give.tiers.some(
        (t) =>
          !(t.minSubtotal > 0) ||
          !(Number.isInteger(t.percent) && t.percent >= 1 && t.percent <= 90),
      )
    ) {
      errors.giveValue =
        "Each step needs a cart value above ₹0 and a whole percentage from 1 to 90.";
    } else if (new Set(values).size !== values.length)
      errors.giveValue = "Each step needs a different cart value.";
  }
  if (draft.maxDiscount !== null && !(draft.maxDiscount > 0))
    errors.maxDiscount =
      "Leave it empty for no maximum, or enter an amount above ₹0.";
  if (draft.scope === "CATEGORIES" && draft.categoryIds.length === 0)
    errors.categoryIds = "Pick at least one category.";
  if (draft.scope === "PRODUCTS" && draft.productIds.length === 0)
    errors.productIds = "Pick at least one product.";
  if (draft.audience === "SPECIFIC") {
    const contacts = normalizeContacts(draft.allowedContacts);
    if (contacts.bad.length)
      errors.allowedContacts = `These don't look like an email or phone number: ${contacts.bad.slice(0, 3).join(", ")}`;
    else if (contacts.ok.length === 0)
      errors.allowedContacts = "Add at least one email or phone number.";
  }
  if (draft.minOrderValue !== null && !(draft.minOrderValue > 0))
    errors.minOrderValue = "Leave it empty, or enter an amount above ₹0.";
  if (!wholeAtLeast(draft.minItems, 1))
    errors.minItems = "Leave it empty, or enter a whole number from 1.";
  if (!wholeAtLeast(draft.usageLimit, 1))
    errors.usageLimit =
      "Leave it empty for no limit, or enter a whole number from 1.";
  if (!wholeAtLeast(draft.perCustomerLimit, 1))
    errors.perCustomerLimit =
      "Leave it empty for no limit, or enter a whole number from 1.";
  const starts = istLocalToDate(draft.startsAt);
  const ends = istLocalToDate(draft.endsAt);
  if (draft.startsAt && !starts) errors.startsAt = "Pick a date and time.";
  if (draft.endsAt && !ends) errors.endsAt = "Pick a date and time.";
  if (starts && ends && ends <= starts)
    errors.endsAt = "The end has to be after the start.";
  if (!(
    Number.isInteger(draft.priority) &&
    draft.priority >= -100 &&
    draft.priority <= 100
  )) {
    errors.priority = "Use a whole number from -100 to 100.";
  }
  return errors;
}

function ruleFor(give: CouponDraft["give"]): {
  type: DiscountType;
  config: Prisma.InputJsonValue;
} {
  switch (give.type) {
    case "PERCENTAGE":
      return { type: "PERCENTAGE", config: { percentage: give.percent } };
    case "FLAT":
      return { type: "FLAT", config: { amount: give.amount } };
    case "BUY_X_GET_Y":
      return {
        type: "BUY_X_GET_Y",
        config: { buyQty: give.buyQty, getQty: give.getQty },
      };
    case "TIERED":
      return {
        type: "TIERED",
        config: {
          tiers: [...give.tiers].sort((a, b) => a.minSubtotal - b.minSubtotal),
        },
      };
    case "FREE_SHIPPING":
      return { type: "FREE_SHIPPING", config: {} };
  }
}

const LOCKED_FIELDS = [
  "code",
  "give",
  "maxDiscount",
  "scope",
  "categoryIds",
  "productIds",
  "excludeSaleItems",
  "combinableWithCoupons",
  "combinableWithInsider",
  "prepaidOnly",
] as const;

export async function couponUseCount(
  couponId: string,
): Promise<{ confirmed: number; held: number }> {
  const [confirmed, held] = await Promise.all([
    prisma.couponRedemption.count({ where: { couponId, status: "CONFIRMED" } }),
    prisma.couponRedemption.count({ where: { couponId, status: "RESERVED" } }),
  ]);
  return { confirmed, held };
}

export type SaveCouponResult =
  { ok: true; id: string } | { ok: false; errors: DraftErrors };

export async function saveCoupon(
  draft: CouponDraft,
  actor: AuditActor,
  couponId?: string,
): Promise<SaveCouponResult> {
  const errors = validateCouponDraft(draft);
  if (Object.keys(errors).length) return { ok: false, errors };
  const code = normalizeCode(draft.code);

  const clash = await prisma.coupon.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      ...(couponId ? { NOT: { id: couponId } } : {}),
    },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { code: "Another coupon already uses this code." },
    };

  let before: Awaited<ReturnType<typeof loadCouponDraft>> = null;
  if (couponId) {
    before = await loadCouponDraft(couponId);
    if (!before)
      return { ok: false, errors: { code: "This coupon no longer exists." } };
    if (before.locked) {
      for (const field of LOCKED_FIELDS) {
        const was = field === "code" ? before.draft.code : before.draft[field];
        const now = field === "code" ? code : draft[field];
        if (JSON.stringify(was) !== JSON.stringify(now)) {
          return {
            ok: false,
            errors: {
              [field === "give" ? "giveValue" : field]:
                "This coupon has been used, so the deal can't change. Duplicate it to make a new version.",
            },
          };
        }
      }
    }
  }

  const contacts =
    draft.audience === "SPECIFIC"
      ? normalizeContacts(draft.allowedContacts).ok
      : [];
  const data = {
    code,
    description: draft.description?.trim() || null,
    isActive: draft.isActive,
    startsAt: istLocalToDate(draft.startsAt),
    endsAt: istLocalToDate(draft.endsAt),
    usageLimit: draft.usageLimit,
    perCustomerLimit: draft.perCustomerLimit,
    minOrderValue:
      draft.minOrderValue === null
        ? null
        : new Prisma.Decimal(draft.minOrderValue),
    maxDiscount:
      draft.maxDiscount === null ||
      draft.give.type === "FLAT" ||
      draft.give.type === "FREE_SHIPPING"
        ? null
        : new Prisma.Decimal(draft.maxDiscount),
    scope: draft.scope,
    categoryIds: draft.scope === "CATEGORIES" ? draft.categoryIds : [],
    productIds: draft.scope === "PRODUCTS" ? draft.productIds : [],
    excludeSaleItems: draft.excludeSaleItems,
    audience: draft.audience,
    allowedContacts: contacts,
    minItems: draft.minItems,
    autoApply: draft.autoApply,
    combinableWithCoupons: draft.combinableWithCoupons,
    combinableWithInsider: draft.combinableWithInsider,
    prepaidOnly: draft.prepaidOnly,
    priority: draft.priority,
  };
  const rule = ruleFor(draft.give);

  const id = await prisma.$transaction(async (tx) => {
    const coupon = couponId
      ? await tx.coupon.update({ where: { id: couponId }, data })
      : await tx.coupon.create({ data });
    if (!before?.locked) {
      await tx.discountRule.deleteMany({ where: { couponId: coupon.id } });
      await tx.discountRule.create({
        data: {
          couponId: coupon.id,
          type: rule.type,
          config: rule.config,
          priority: 0,
          stackable: draft.combinableWithCoupons,
        },
      });
    }
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: couponId ? "coupon.update" : "coupon.create",
        entityType: "Coupon",
        entityId: coupon.id,
        beforeState: before ? { ...before.draft } : null,
        afterState: { ...draft, code },
      },
      tx,
    );
    return coupon.id;
  });
  return { ok: true, id };
}

export async function loadCouponDraft(couponId: string): Promise<{
  draft: CouponDraft;
  locked: boolean;
  uses: { confirmed: number; held: number };
} | null> {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: {
      rules: { orderBy: [{ priority: "desc" }, { id: "asc" }], take: 1 },
    },
  });
  if (!coupon) return null;
  const rule = coupon.rules[0];
  const config = (rule?.config ?? {}) as Record<string, unknown>;
  let give: CouponDraft["give"] = { type: "PERCENTAGE", percent: 10 };
  if (rule?.type === "PERCENTAGE")
    give = { type: "PERCENTAGE", percent: Number(config.percentage) };
  if (rule?.type === "FLAT")
    give = { type: "FLAT", amount: Number(config.amount) };
  if (rule?.type === "BUY_X_GET_Y")
    give = {
      type: "BUY_X_GET_Y",
      buyQty: Number(config.buyQty),
      getQty: Number(config.getQty),
    };
  if (rule?.type === "TIERED")
    give = {
      type: "TIERED",
      tiers: (config.tiers as { minSubtotal: number; percent: number }[]) ?? [],
    };
  if (rule?.type === "FREE_SHIPPING") give = { type: "FREE_SHIPPING" };
  const uses = await couponUseCount(couponId);
  return {
    locked: uses.confirmed + uses.held > 0,
    uses,
    draft: {
      code: coupon.code.toUpperCase(),
      description: coupon.description,
      isActive: coupon.isActive,
      give,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      scope: coupon.scope,
      categoryIds: coupon.categoryIds,
      productIds: coupon.productIds,
      excludeSaleItems: coupon.excludeSaleItems,
      audience: coupon.audience,
      allowedContacts: coupon.allowedContacts,
      minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
      minItems: coupon.minItems,
      usageLimit: coupon.usageLimit,
      perCustomerLimit: coupon.perCustomerLimit,
      startsAt: dateToIstLocal(coupon.startsAt),
      endsAt: dateToIstLocal(coupon.endsAt),
      autoApply: coupon.autoApply,
      combinableWithCoupons: coupon.combinableWithCoupons,
      combinableWithInsider: coupon.combinableWithInsider,
      prepaidOnly: coupon.prepaidOnly,
      priority: coupon.priority,
    },
  };
}

/** Copies a coupon into a new, switched-off one with a new code. */
export async function duplicateCoupon(
  couponId: string,
  actor: AuditActor,
): Promise<SaveCouponResult> {
  const loaded = await loadCouponDraft(couponId);
  if (!loaded)
    return { ok: false, errors: { code: "This coupon no longer exists." } };
  for (let n = 2; n < 50; n++) {
    const code = `${loaded.draft.code.slice(0, 26)}-${n}`;
    const taken = await prisma.coupon.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true },
    });
    if (!taken)
      return saveCoupon({ ...loaded.draft, code, isActive: false }, actor);
  }
  return {
    ok: false,
    errors: { code: "Couldn't find a free code for the copy." },
  };
}

/** Switch a coupon on or off (allowed even after it's been used). */
export async function setCouponActive(
  couponId: string,
  isActive: boolean,
  actor: AuditActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.coupon.findUniqueOrThrow({
      where: { id: couponId },
      select: { isActive: true },
    });
    await tx.coupon.update({ where: { id: couponId }, data: { isActive } });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: isActive ? "coupon.activate" : "coupon.deactivate",
        entityType: "Coupon",
        entityId: couponId,
        beforeState: before,
        afterState: { isActive },
      },
      tx,
    );
  });
}

/**
 * Deletes a coupon that has never been used. A code that appears on any
 * order (or is held for one) is kept for the order history: pause it instead.
 */
export async function deleteCoupon(
  couponId: string,
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "USED" }> {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({
      where: { id: couponId },
      select: { id: true, code: true, isActive: true },
    });
    if (!coupon) return { ok: false as const, reason: "NOT_FOUND" as const };
    const [redemptions, onOrders] = await Promise.all([
      tx.couponRedemption.count({ where: { couponId } }),
      tx.orderDiscount.count({ where: { couponId } }),
    ]);
    if (redemptions > 0 || onOrders > 0)
      return { ok: false as const, reason: "USED" as const };
    await tx.discountRule.deleteMany({ where: { couponId } });
    await tx.coupon.delete({ where: { id: couponId } });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "coupon.delete",
        entityType: "Coupon",
        entityId: couponId,
        beforeState: coupon,
        afterState: null,
      },
      tx,
    );
    return { ok: true as const };
  });
}

export type CouponState = "LIVE" | "SCHEDULED" | "ENDED" | "OFF" | "USED_UP";

export interface CouponListRow {
  id: string;
  code: string;
  summary: string;
  state: CouponState;
  isActive: boolean;
  autoApply: boolean;
  uses: number;
  usageLimit: number | null;
  totalDiscount: number;
  endsAt: Date | null;
}

export async function listCouponsForAdmin(): Promise<CouponListRow[]> {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { rules: { take: 1, orderBy: { priority: "desc" } } },
  });
  const usage = await prisma.couponRedemption.groupBy({
    by: ["couponId"],
    where: { status: { in: ["CONFIRMED", "RESERVED"] } },
    _count: { _all: true },
    _sum: { discountAmount: true },
  });
  const now = new Date();
  return coupons.map((coupon) => {
    const used = usage.find((u) => u.couponId === coupon.id);
    const uses = used?._count._all ?? 0;
    let state: CouponState = "LIVE";
    if (!coupon.isActive) state = "OFF";
    else if (coupon.endsAt && coupon.endsAt <= now) state = "ENDED";
    else if (coupon.startsAt && coupon.startsAt > now) state = "SCHEDULED";
    else if (coupon.usageLimit !== null && uses >= coupon.usageLimit)
      state = "USED_UP";
    const pricing = draftToPricing({
      give: giveFromRule(coupon.rules[0]?.type, coupon.rules[0]?.config),
    } as Pick<CouponDraft, "give">);
    return {
      id: coupon.id,
      code: coupon.code.toUpperCase(),
      summary: pricing ? describeGive(pricing) : "No discount set",
      state,
      isActive: coupon.isActive,
      autoApply: coupon.autoApply,
      uses,
      usageLimit: coupon.usageLimit,
      totalDiscount: used?._sum.discountAmount
        ? toMinorUnits(used._sum.discountAmount)
        : 0,
      endsAt: coupon.endsAt,
    };
  });
}

function giveFromRule(
  type: DiscountType | undefined,
  config: unknown,
): CouponDraft["give"] {
  const c = (config ?? {}) as Record<string, unknown>;
  switch (type) {
    case "FLAT":
      return { type: "FLAT", amount: Number(c.amount) };
    case "BUY_X_GET_Y":
      return {
        type: "BUY_X_GET_Y",
        buyQty: Number(c.buyQty),
        getQty: Number(c.getQty),
      };
    case "TIERED":
      return {
        type: "TIERED",
        tiers: (c.tiers as { minSubtotal: number; percent: number }[]) ?? [],
      };
    case "FREE_SHIPPING":
      return { type: "FREE_SHIPPING" };
    default:
      return { type: "PERCENTAGE", percent: Number(c.percentage ?? 0) };
  }
}

function draftToPricing(draft: Pick<CouponDraft, "give">): DiscountGive | null {
  const give = draft.give;
  switch (give.type) {
    case "PERCENTAGE":
      return { type: "PERCENTAGE", percent: give.percent };
    case "FLAT":
      return { type: "FLAT", amount: Math.round(give.amount * 100) };
    case "BUY_X_GET_Y":
      return give;
    case "TIERED":
      return {
        type: "TIERED",
        tiers: give.tiers.map((t) => ({
          minSubtotal: Math.round(t.minSubtotal * 100),
          percent: t.percent,
        })),
      };
    case "FREE_SHIPPING":
      return give;
  }
}

/**
 * The live preview on the coupon form: what a sample cart would get, run
 * through the same engine as checkout. Every sample item counts as eligible.
 */
export function previewCoupon(
  draft: CouponDraft,
  sample: { cartValue: number; items: number },
  shipping: { freeThreshold: number; fee: number },
): { discount: number; freeShipping: boolean; reason: string | null } {
  const give = draftToPricing(draft);
  if (!give || sample.items < 1 || !(sample.cartValue > 0))
    return { discount: 0, freeShipping: false, reason: null };
  const total = Math.round(sample.cartValue * 100);
  const each = Math.floor(total / sample.items);
  const lines = Array.from({ length: sample.items }, (_, i) => ({
    key: `s${i}`,
    productId: draft.productIds[0] ?? "sample",
    categoryId: draft.categoryIds[0] ?? "sample",
    unitPrice: i === 0 ? total - each * (sample.items - 1) : each,
    compareAtPrice: null,
    quantity: 1,
  }));
  const coupon: PricingCoupon = {
    id: "preview",
    code: "PREVIEW",
    label: "Preview",
    give,
    maxDiscount:
      draft.maxDiscount === null ? null : Math.round(draft.maxDiscount * 100),
    scope: draft.scope,
    categoryIds: draft.categoryIds,
    productIds: draft.productIds,
    excludeSaleItems: false,
    minOrderValue:
      draft.minOrderValue === null
        ? null
        : Math.round(draft.minOrderValue * 100),
    minItems: draft.minItems,
    combinableWithCoupons: true,
    combinableWithInsider: true,
    prepaidOnly: false,
    priority: 0,
    createdAt: 0,
    source: "code",
  };
  const result = priceCart({
    lines,
    insider: null,
    coupons: [coupon],
    paymentMethod: null,
    shipping,
    codFee: 0,
  });
  const rejected = result.rejected[0];
  return {
    discount: result.discountTotal,
    freeShipping:
      result.shippingSaved > 0 || result.discounts.some((d) => d.freeShipping),
    reason: rejected
      ? rejected.reason === "MIN_ORDER"
        ? `Needs ₹${((rejected.short ?? 0) / 100).toLocaleString("en-IN")} more in the cart`
        : rejected.reason === "MIN_ITEMS"
          ? `Needs ${rejected.short} more item${rejected.short === 1 ? "" : "s"}`
          : "Wouldn't apply to this cart"
      : null,
  };
}
