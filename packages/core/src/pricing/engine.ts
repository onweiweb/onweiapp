/**
 * The one place prices, discounts, delivery and COD fees are worked out.
 * Pure (no database), so the cart, checkout, order placement and the admin
 * coupon preview all get the same answer. Rules: docs/COMMERCE_BUILD_PLAN.md
 * section 5 ("Coupon safety rules"). All money is integer paise.
 *
 * Order of work:
 * 1. Each line starts at its selling price (GST inclusive) times quantity.
 * 2. The Insider discount, if the customer is an Insider and every coupon
 *    used allows it.
 * 3. Item-level coupons (categories or products), then cart-level coupons,
 *    each by priority. A coupon's minimum cart value is checked against the
 *    cart after the discounts before it.
 * 4. Each coupon's maximum applies to that coupon alone.
 * 5. Delivery and COD fees are added last and never discounted, except that
 *    a free-delivery coupon removes the delivery fee.
 *
 * When codes can't all be used together, the engine tries every allowed
 * combination and keeps the one that saves the customer the most.
 */

export type DiscountGive =
  | { type: "PERCENTAGE"; percent: number }
  | { type: "FLAT"; amount: number }
  | { type: "BUY_X_GET_Y"; buyQty: number; getQty: number }
  | { type: "TIERED"; tiers: { minSubtotal: number; percent: number }[] }
  | { type: "FREE_SHIPPING" };

export interface PricingLine {
  key: string;
  productId: string;
  categoryId: string;
  /** Selling price per unit, paise, GST inclusive. */
  unitPrice: number;
  /** Struck-through price, paise. Above unitPrice means the item is on sale. */
  compareAtPrice: number | null;
  quantity: number;
}

export interface PricingCoupon {
  id: string;
  code: string;
  label: string;
  give: DiscountGive;
  /** Paise. Null means no maximum. */
  maxDiscount: number | null;
  scope: "CART" | "CATEGORIES" | "PRODUCTS";
  categoryIds: readonly string[];
  productIds: readonly string[];
  excludeSaleItems: boolean;
  /** Paise. */
  minOrderValue: number | null;
  minItems: number | null;
  combinableWithCoupons: boolean;
  combinableWithInsider: boolean;
  prepaidOnly: boolean;
  priority: number;
  /** Milliseconds, for tie-breaks (earliest created wins). */
  createdAt: number;
  /** "code" if the customer typed it, "auto" if it applies by itself. */
  source: "code" | "auto";
}

export interface PricingInput {
  lines: readonly PricingLine[];
  insider: { percent: number } | null;
  coupons: readonly PricingCoupon[];
  paymentMethod: "RAZORPAY" | "COD" | null;
  shipping: { freeThreshold: number; fee: number };
  codFee: number;
}

export interface PricedLine {
  key: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
}

export interface AppliedDiscount {
  kind: "INSIDER" | "COUPON";
  couponId: string | null;
  code: string | null;
  label: string;
  amount: number;
  freeShipping: boolean;
  /** Per-line share of this discount, by line key. */
  perLine: Record<string, number>;
}

export type CouponRejectionReason =
  | "MIN_ORDER"
  | "MIN_ITEMS"
  | "NO_ELIGIBLE_ITEMS"
  | "PREPAID_ONLY"
  | "NOT_WITH_INSIDER"
  | "NOT_WITH_COUPON"
  | "BETTER_OFFER";

export interface RejectedCoupon {
  couponId: string;
  code: string;
  reason: CouponRejectionReason;
  /** MIN_ORDER: paise still needed. MIN_ITEMS: items still needed. */
  short?: number;
  /** NOT_WITH_COUPON: the code that blocks it. */
  blockedBy?: string;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotal: number;
  discounts: AppliedDiscount[];
  discountTotal: number;
  /** Goods after discounts. */
  merchandiseTotal: number;
  shippingFee: number;
  /** Delivery fee saved by a free-delivery coupon. */
  shippingSaved: number;
  codFee: number;
  total: number;
  /** Paise still to add for free delivery, 0 when already free. */
  freeShippingRemaining: number;
  insiderApplied: boolean;
  /** Insider was available but a code that can't be combined saved more. */
  insiderBlockedBy: string | null;
  rejected: RejectedCoupon[];
}

const MAX_COMBINATION_COUPONS = 8;

/** Half up, on non-negative numbers. */
function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function isOnSale(line: PricingLine): boolean {
  return line.compareAtPrice !== null && line.compareAtPrice > line.unitPrice;
}

function eligibleKeys(
  coupon: PricingCoupon,
  lines: readonly PricingLine[],
): Set<string> {
  const keys = new Set<string>();
  for (const line of lines) {
    if (coupon.excludeSaleItems && isOnSale(line)) continue;
    if (
      coupon.scope === "CATEGORIES" &&
      !coupon.categoryIds.includes(line.categoryId)
    )
      continue;
    if (
      coupon.scope === "PRODUCTS" &&
      !coupon.productIds.includes(line.productId)
    )
      continue;
    keys.add(line.key);
  }
  return keys;
}

/**
 * Splits `amount` over lines in proportion to their value. Each share is
 * rounded down; the leftover paise go one at a time to the largest lines, so
 * the shares always add up to exactly `amount`.
 */
export function allocate(
  amount: number,
  values: readonly { key: string; value: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  const base = values.reduce((sum, v) => sum + v.value, 0);
  amount = Math.min(amount, base);
  if (amount <= 0 || base <= 0) {
    for (const v of values) out[v.key] = 0;
    return out;
  }
  let given = 0;
  for (const v of values) {
    const share = Math.floor((amount * v.value) / base);
    out[v.key] = share;
    given += share;
  }
  let left = amount - given;
  const order = [...values].sort(
    (a, b) => b.value - a.value || (a.key < b.key ? -1 : 1),
  );
  for (let i = 0; left > 0; i = (i + 1) % order.length) {
    const v = order[i]!;
    if (v.value > (out[v.key] ?? 0)) {
      out[v.key] = (out[v.key] ?? 0) + 1;
      left--;
    }
  }
  return out;
}

/** The GST included in a GST-inclusive amount, rounded half up. */
export function gstPortion(
  amountInclusive: number,
  ratePercent: number,
): number {
  if (ratePercent <= 0 || amountInclusive <= 0) return 0;
  return roundHalfUp((amountInclusive * ratePercent) / (100 + ratePercent));
}

type Remaining = Map<string, number>;

/**
 * What a coupon would take off, given what is left on each line, and how it
 * splits per line. Never more than the eligible lines are worth.
 */
function couponDiscount(
  coupon: PricingCoupon,
  lines: readonly PricingLine[],
  remaining: Remaining,
  eligible: Set<string>,
): Record<string, number> {
  const eligibleLines = lines.filter((line) => eligible.has(line.key));
  const values = eligibleLines.map((line) => ({
    key: line.key,
    value: remaining.get(line.key) ?? 0,
  }));
  const base = values.reduce((sum, v) => sum + v.value, 0);
  const give = coupon.give;

  let amount = 0;
  if (give.type === "PERCENTAGE") {
    amount = roundHalfUp((base * give.percent) / 100);
  } else if (give.type === "FLAT") {
    amount = give.amount;
  } else if (give.type === "TIERED") {
    const tier = [...give.tiers]
      .sort((a, b) => b.minSubtotal - a.minSubtotal)
      .find((t) => base >= t.minSubtotal);
    amount = tier ? roundHalfUp((base * tier.percent) / 100) : 0;
  } else if (give.type === "BUY_X_GET_Y") {
    // Every unit at its current value; in each group of buy+get, the
    // cheapest `get` units are free.
    const units: { key: string; value: number }[] = [];
    for (const line of eligibleLines) {
      const lineValue = remaining.get(line.key) ?? 0;
      const each = Math.floor(lineValue / line.quantity);
      const extra = lineValue - each * line.quantity;
      for (let i = 0; i < line.quantity; i++) {
        units.push({ key: line.key, value: each + (i < extra ? 1 : 0) });
      }
    }
    const groupSize = give.buyQty + give.getQty;
    const freeCount = Math.floor(units.length / groupSize) * give.getQty;
    const cheapest = [...units]
      .sort((a, b) => a.value - b.value)
      .slice(0, freeCount);
    const perLine: Record<string, number> = {};
    for (const unit of cheapest)
      perLine[unit.key] = (perLine[unit.key] ?? 0) + unit.value;
    let total = cheapest.reduce((sum, unit) => sum + unit.value, 0);
    if (coupon.maxDiscount !== null && total > coupon.maxDiscount) {
      // Scale down to the maximum, spread over the free units' lines.
      total = coupon.maxDiscount;
      return allocate(
        total,
        Object.entries(perLine).map(([key, value]) => ({ key, value })),
      );
    }
    return perLine;
  } else {
    amount = 0; // FREE_SHIPPING: nothing off the goods.
  }

  if (coupon.maxDiscount !== null)
    amount = Math.min(amount, coupon.maxDiscount);
  amount = Math.max(0, Math.min(amount, base));
  return allocate(amount, values);
}

interface Scenario {
  insider: boolean;
  coupons: PricingCoupon[];
}

interface ScenarioResult {
  valid: boolean;
  discounts: AppliedDiscount[];
  remaining: Remaining;
  freeShipping: boolean;
  /** Coupons whose minimum failed after earlier discounts. */
  failed: PricingCoupon[];
}

function sortForApplication(coupons: PricingCoupon[]): PricingCoupon[] {
  return [...coupons].sort((a, b) => {
    const levelA = a.scope === "CART" ? 1 : 0;
    const levelB = b.scope === "CART" ? 1 : 0;
    if (levelA !== levelB) return levelA - levelB;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.createdAt - b.createdAt;
  });
}

function runScenario(input: PricingInput, scenario: Scenario): ScenarioResult {
  const remaining: Remaining = new Map(
    input.lines.map((line) => [line.key, line.unitPrice * line.quantity]),
  );
  const discounts: AppliedDiscount[] = [];
  const failed: PricingCoupon[] = [];
  let freeShipping = false;

  const apply = (perLine: Record<string, number>) => {
    for (const [key, value] of Object.entries(perLine)) {
      remaining.set(key, (remaining.get(key) ?? 0) - value);
    }
  };

  if (scenario.insider && input.insider) {
    const values = input.lines.map((line) => ({
      key: line.key,
      value: remaining.get(line.key) ?? 0,
    }));
    const base = values.reduce((sum, v) => sum + v.value, 0);
    const amount = Math.min(
      base,
      roundHalfUp((base * input.insider.percent) / 100),
    );
    const perLine = allocate(amount, values);
    apply(perLine);
    discounts.push({
      kind: "INSIDER",
      couponId: null,
      code: null,
      label: `Insider ${input.insider.percent}% off`,
      amount,
      freeShipping: false,
      perLine,
    });
  }

  for (const coupon of sortForApplication(scenario.coupons)) {
    const eligible = eligibleKeys(coupon, input.lines);
    const runningTotal = [...remaining.values()].reduce((sum, v) => sum + v, 0);
    if (coupon.minOrderValue !== null && runningTotal < coupon.minOrderValue) {
      failed.push(coupon);
      continue;
    }
    if (coupon.give.type === "FREE_SHIPPING") {
      freeShipping = true;
      discounts.push({
        kind: "COUPON",
        couponId: coupon.id,
        code: coupon.code,
        label: coupon.label,
        amount: 0,
        freeShipping: true,
        perLine: {},
      });
      continue;
    }
    const perLine = couponDiscount(coupon, input.lines, remaining, eligible);
    const amount = Object.values(perLine).reduce((sum, v) => sum + v, 0);
    if (amount <= 0) {
      failed.push(coupon);
      continue;
    }
    apply(perLine);
    discounts.push({
      kind: "COUPON",
      couponId: coupon.id,
      code: coupon.code,
      label: coupon.label,
      amount,
      freeShipping: false,
      perLine,
    });
  }

  return {
    valid: failed.length === 0,
    discounts,
    remaining,
    freeShipping,
    failed,
  };
}

function shippingFor(
  input: PricingInput,
  merchandiseTotal: number,
  freeShipping: boolean,
): { fee: number; saved: number } {
  if (input.lines.length === 0) return { fee: 0, saved: 0 };
  const due =
    merchandiseTotal < input.shipping.freeThreshold ? input.shipping.fee : 0;
  return freeShipping ? { fee: 0, saved: due } : { fee: due, saved: 0 };
}

function compatible(scenario: Scenario): boolean {
  const { coupons } = scenario;
  if (scenario.insider && coupons.some((c) => !c.combinableWithInsider))
    return false;
  if (coupons.length > 1 && coupons.some((c) => !c.combinableWithCoupons))
    return false;
  return true;
}

/** Checks a coupon against the cart on its own (before other discounts). */
function standaloneRejection(
  coupon: PricingCoupon,
  input: PricingInput,
): RejectedCoupon | null {
  if (coupon.prepaidOnly && input.paymentMethod === "COD") {
    return { couponId: coupon.id, code: coupon.code, reason: "PREPAID_ONLY" };
  }
  const eligible = eligibleKeys(coupon, input.lines);
  if (eligible.size === 0) {
    return {
      couponId: coupon.id,
      code: coupon.code,
      reason: "NO_ELIGIBLE_ITEMS",
    };
  }
  const items = input.lines
    .filter((line) => eligible.has(line.key))
    .reduce((sum, line) => sum + line.quantity, 0);
  if (coupon.minItems !== null && items < coupon.minItems) {
    return {
      couponId: coupon.id,
      code: coupon.code,
      reason: "MIN_ITEMS",
      short: coupon.minItems - items,
    };
  }
  const subtotal = input.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
    return {
      couponId: coupon.id,
      code: coupon.code,
      reason: "MIN_ORDER",
      short: coupon.minOrderValue - subtotal,
    };
  }
  if (
    coupon.give.type === "BUY_X_GET_Y" &&
    items < coupon.give.buyQty + coupon.give.getQty
  ) {
    return {
      couponId: coupon.id,
      code: coupon.code,
      reason: "MIN_ITEMS",
      short: coupon.give.buyQty + coupon.give.getQty - items,
    };
  }
  return null;
}

export function priceCart(input: PricingInput): PricingResult {
  const subtotal = input.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const rejected: RejectedCoupon[] = [];

  // Duplicate codes count once.
  const unique = new Map<string, PricingCoupon>();
  for (const coupon of input.coupons) {
    if (!unique.has(coupon.id)) unique.set(coupon.id, coupon);
  }
  const candidates: PricingCoupon[] = [];
  for (const coupon of unique.values()) {
    const why = standaloneRejection(coupon, input);
    if (why) {
      if (coupon.source === "code") rejected.push(why);
    } else {
      candidates.push(coupon);
    }
  }
  // Typed codes first, then automatic offers by priority, capped.
  candidates.sort((a, b) =>
    a.source !== b.source
      ? a.source === "code"
        ? -1
        : 1
      : b.priority - a.priority || a.createdAt - b.createdAt,
  );
  const pool = candidates.slice(0, MAX_COMBINATION_COUPONS);

  const insiderOptions = input.insider ? [true, false] : [false];
  let best: {
    scenario: Scenario;
    result: ScenarioResult;
    savings: number;
    typed: number;
  } | null = null;

  for (let mask = 0; mask < 1 << pool.length; mask++) {
    const chosen = pool.filter((_, i) => mask & (1 << i));
    for (const insider of insiderOptions) {
      const scenario: Scenario = { insider, coupons: chosen };
      if (!compatible(scenario)) continue;
      const result = runScenario(input, scenario);
      if (!result.valid) continue;
      const merchandise = [...result.remaining.values()].reduce(
        (sum, v) => sum + v,
        0,
      );
      const shipping = shippingFor(input, merchandise, result.freeShipping);
      // Biggest saving wins (discounts plus delivery saved by a free-delivery
      // coupon). Ties: more typed codes honoured, then the Insider discount
      // (the customer's own perk), then fewer coupons used. Delivery fees from
      // the free-delivery threshold are not part of the comparison, so a
      // discount is never dropped just to stay above the threshold.
      const typed = chosen.filter((c) => c.source === "code").length;
      const savings =
        result.discounts.reduce((sum, d) => sum + d.amount, 0) + shipping.saved;
      if (
        !best ||
        savings > best.savings ||
        (savings === best.savings &&
          (typed > best.typed ||
            (typed === best.typed &&
              ((insider && !best.scenario.insider) ||
                (insider === best.scenario.insider &&
                  chosen.length < best.scenario.coupons.length)))))
      ) {
        best = { scenario, result, savings, typed };
      }
    }
  }

  // There is always at least the empty scenario.
  const winner = best!;
  const chosenIds = new Set(winner.scenario.coupons.map((c) => c.id));
  const insiderApplied = winner.scenario.insider;

  let insiderBlockedBy: string | null = null;
  if (input.insider && !insiderApplied) {
    const blocker = winner.scenario.coupons.find(
      (c) => !c.combinableWithInsider,
    );
    insiderBlockedBy = blocker?.code ?? null;
  }

  for (const coupon of candidates) {
    if (chosenIds.has(coupon.id) || coupon.source !== "code") continue;
    if (insiderApplied && !coupon.combinableWithInsider) {
      rejected.push({
        couponId: coupon.id,
        code: coupon.code,
        reason: "NOT_WITH_INSIDER",
      });
      continue;
    }
    const blocker = winner.scenario.coupons.find(
      (c) => !c.combinableWithCoupons || !coupon.combinableWithCoupons,
    );
    if (blocker) {
      rejected.push({
        couponId: coupon.id,
        code: coupon.code,
        reason: "NOT_WITH_COUPON",
        blockedBy: blocker.code,
      });
      continue;
    }
    rejected.push({
      couponId: coupon.id,
      code: coupon.code,
      reason: "BETTER_OFFER",
    });
  }

  const lines: PricedLine[] = input.lines.map((line) => {
    const lineSubtotal = line.unitPrice * line.quantity;
    const total = winner.result.remaining.get(line.key) ?? lineSubtotal;
    return {
      key: line.key,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      subtotal: lineSubtotal,
      discount: lineSubtotal - total,
      total,
    };
  });
  const merchandiseTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const discountTotal = subtotal - merchandiseTotal;
  const shipping = shippingFor(
    input,
    merchandiseTotal,
    winner.result.freeShipping,
  );
  const codFee =
    input.paymentMethod === "COD" && input.lines.length > 0 ? input.codFee : 0;
  const freeShippingRemaining =
    input.lines.length === 0 || winner.result.freeShipping
      ? 0
      : Math.max(0, input.shipping.freeThreshold - merchandiseTotal);

  return {
    lines,
    subtotal,
    discounts: winner.result.discounts,
    discountTotal,
    merchandiseTotal,
    shippingFee: shipping.fee,
    shippingSaved: shipping.saved,
    codFee,
    total: merchandiseTotal + shipping.fee + codFee,
    freeShippingRemaining,
    insiderApplied,
    insiderBlockedBy,
    rejected,
  };
}
