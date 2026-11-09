import type { Metadata } from "next";
import Link from "next/link";
import { getAccountSummary } from "@onwei/core";
import { CheckoutShell, HelpCard } from "../_components/CheckoutShell";
import { loadResultOrder } from "../_components/loadOrder";
import {
  OrderDetailsCard,
  OrderProgress,
  OrderSummaryCard,
  ResultIcon,
  ResultTag,
} from "../_components/ResultParts";
import { AutoRefresh } from "../_components/RetryPayment";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Figma "Checkout – Payment successful" (1257:7316 desktop, 1257:7898 mobile).
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order, customerId } = await loadResultOrder(searchParams);
  const account = await getAccountSummary(customerId);
  const firstName =
    account?.name?.split(/\s+/)[0] ??
    order.address?.fullName.split(/\s+/)[0] ??
    null;
  const confirming = order.status === "PENDING";

  return (
    <CheckoutShell>
      <div className="grid grid-cols-1 gap-8 desk:grid-cols-[1fr_27.5rem] desk:gap-14">
        <div className="flex flex-col gap-6">
          <ResultIcon tone="ok" />
          <ResultTag
            label={`Order #${order.orderNumber} · ${confirming ? "Confirming" : "Confirmed"}`}
            note="Good move!"
          />
          <h1 className="font-display text-[length:max(3rem,34px)] font-bold uppercase leading-[0.95]">
            {confirming
              ? "Confirming your payment"
              : firstName
                ? `Thanks, ${firstName}!`
                : "Thank you!"}
            {confirming ? null : (
              <>
                <br />
                You&apos;re all set.
              </>
            )}
          </h1>
          {confirming ? (
            <>
              <AutoRefresh />
              <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.6]">
                This takes a few seconds. Keep this page open; it updates by
                itself. If money left your account and this doesn&apos;t update,
                don&apos;t worry: you&apos;ll either get your order or a full
                refund.
              </p>
            </>
          ) : (
            <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.6]">
              {order.contactEmail
                ? `We've sent your confirmation to ${order.contactEmail}. `
                : ""}
              We&apos;re packing your order now and you&apos;ll get tracking
              details as soon as it ships.
            </p>
          )}
          <OrderProgress status={order.status} />
          <OrderDetailsCard order={order} />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/collection/all"
              className="flex h-12 items-center rounded-full bg-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-beige"
            >
              Continue shopping
            </Link>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="flex h-12 items-center rounded-full border border-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em]"
            >
              Track your order
            </Link>
          </div>
          <HelpCard
            title="Questions about your order?"
            body="Reply to your confirmation email or get in touch, and we'll get back to you within a day."
          />
        </div>
        <div className="desk:self-start">
          <OrderSummaryCard
            order={order}
            badge={
              order.paymentMethod === "COD"
                ? "Cash on delivery"
                : confirming
                  ? "Confirming"
                  : "Paid"
            }
            totalLabel={
              order.paymentMethod === "COD"
                ? "To pay on delivery"
                : "Total paid"
            }
          />
        </div>
      </div>
    </CheckoutShell>
  );
}
