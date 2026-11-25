import type { CartPreorder } from "@onwei/core";
import { rupees } from "../../../lib/messages/commerce";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** The day before an exclusive deadline: the last day to pay. */
export function lastDayText(iso: string): string {
  return DATE.format(new Date(Date.parse(iso) - 1));
}

// Under the bag and checkout totals while a pre-order lap runs: what is paid
// today (the reserve) and what is left for later. No Figma frame; styled like
// the totals above it (design approved 2026-11-26).
export function PreorderSummary({
  preorder,
  total,
}: {
  preorder: CartPreorder;
  /** Paise, the order total after discounts and delivery. */
  total: number;
}) {
  const row =
    "flex justify-between gap-3 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue";
  return (
    <div className="flex flex-col gap-1.5">
      <dl className="flex flex-col gap-1.5">
        <div className={`${row} border-t border-onwei-blue/20 pt-2`}>
          <dt>Order total</dt>
          <dd>{rupees(total)}</dd>
        </div>
        <div
          className={`${row} rounded-[0.75rem] bg-onwei-green px-3 py-2 font-bold`}
        >
          <dt>Reserve to pay today</dt>
          <dd>{rupees(preorder.reserveTotal)}</dd>
        </div>
        <div className={row}>
          <dt>Balance, due by {lastDayText(preorder.balanceDueBy)}</dt>
          <dd>{rupees(preorder.balanceDue)}</dd>
        </div>
      </dl>
      {preorder.gifts.length ? (
        <ul className="flex flex-col gap-0.5 font-grotesk text-[length:max(0.75rem,11px)] text-onwei-blue">
          {preorder.gifts.map((gift) => (
            <li key={`${gift.variantId}-${gift.reason}`}>
              Free: {gift.reason}
              {gift.quantity > 1 ? ` × ${gift.quantity}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="font-grotesk text-[length:max(0.6875rem,10px)] text-onwei-blue/70">
        {preorder.tierLabel}, {preorder.percent}% off, locked in today. Reserve{" "}
        {rupees(preorder.reserveLow)} on bags up to{" "}
        {rupees(preorder.reserveThreshold)} at full price,{" "}
        {rupees(preorder.reserveHigh)} above. Cancel from your account before
        pre-orders close and it stays with you as credit.
      </p>
    </div>
  );
}
