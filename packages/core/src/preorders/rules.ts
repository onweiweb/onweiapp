/**
 * The pre-order rules in one place, browser-safe (no database):
 * how much is reserved, when the nudge goes out, when the balance is due and
 * until when a customer can cancel. docs/COMMERCE_BUILD_PLAN.md section 14a.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReserveSettings {
  /** Paise, paid when the bag is at or under the threshold. */
  reserveLow: number;
  /** Paise, paid above the threshold. */
  reserveHigh: number;
  /** Paise, compared with the bag at product price (before any discount). */
  reserveThreshold: number;
}

/**
 * Paid today. Worked out from the product prices before any discount, so it
 * stays the same in every lap. Never more than the order total.
 */
export function reserveForBag(
  settings: ReserveSettings,
  bag: { productTotal: number; total: number },
): { reserveTotal: number; balanceDue: number } {
  if (bag.productTotal <= 0 || bag.total <= 0)
    return { reserveTotal: 0, balanceDue: Math.max(0, bag.total) };
  const tier =
    bag.productTotal <= settings.reserveThreshold
      ? settings.reserveLow
      : settings.reserveHigh;
  const reserveTotal = Math.min(tier, bag.total);
  return { reserveTotal, balanceDue: bag.total - reserveTotal };
}

export interface DeadlineSettings {
  /** Exclusive: the end of the last lap. */
  endsAt: Date;
  nudgeDaysBeforeClose: number;
  balanceDueDaysAfterClose: number;
}

export interface PreorderDeadlines {
  /** The window closes (end of the last lap). */
  closesAt: Date;
  /** The daily job sends the balance nudge from this moment. */
  nudgeAt: Date;
  /** Balance must be paid before this moment, or the reserve becomes credit. */
  balanceDueAt: Date;
}

export function preorderDeadlines(
  campaign: DeadlineSettings,
): PreorderDeadlines {
  const closes = campaign.endsAt.getTime();
  return {
    closesAt: new Date(closes),
    nudgeAt: new Date(closes - campaign.nudgeDaysBeforeClose * DAY_MS),
    balanceDueAt: new Date(closes + campaign.balanceDueDaysAfterClose * DAY_MS),
  };
}

/**
 * A customer can cancel a reserved pre-order until the window closes, unless
 * the balance nudge has gone out or the balance is paid.
 */
export function customerCanCancel(
  order: {
    status: string;
    balanceNudgedAt: Date | null;
    balancePaidAt: Date | null;
  },
  closesAt: Date | null,
  now: Date = new Date(),
): boolean {
  return (
    order.status === "RESERVED" &&
    !order.balanceNudgedAt &&
    !order.balancePaidAt &&
    closesAt !== null &&
    now < closesAt
  );
}
