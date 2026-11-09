import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { codAllowedFor, getStoreSettings } from "@onwei/core";
import { paymentFailureMessage, rupees } from "../../../lib/messages/commerce";
import { CheckoutShell, HelpCard } from "../_components/CheckoutShell";
import { Card } from "../_components/parts";
import { loadResultOrder } from "../_components/loadOrder";
import {
  OrderSummaryCard,
  ResultIcon,
  ResultTag,
} from "../_components/ResultParts";
import { RetryPayment } from "../_components/RetryPayment";

export const metadata: Metadata = {
  title: "Payment unsuccessful",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const CAUSES = [
  "The OTP or UPI request timed out",
  "Your bank declined the payment",
  "The card details didn't match",
  "You've hit the daily limit on your card or UPI app",
];

/** Whole minutes left on a hold, at least 1. */
function minutesUntil(when: Date): number {
  return Math.max(1, Math.ceil((when.getTime() - Date.now()) / 60_000));
}

// Figma "Checkout – Payment failed" (1257:7520 desktop, 1257:8064 mobile).
export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; why?: string }>;
}) {
  const [{ order }, { why }, settings] = await Promise.all([
    loadResultOrder(searchParams),
    searchParams,
    getStoreSettings(),
  ]);
  if (order.status !== "PENDING" && order.status !== "CANCELLED") {
    redirect(`/checkout/success?order=${order.orderNumber}`);
  }
  const reason = paymentFailureMessage(why);
  // Still held: the same order can be paid again. Released: start over from
  // the bag (it's kept), with a fresh hold.
  const held = order.awaitingPayment;
  const minutesLeft = order.holdExpiresAt
    ? minutesUntil(order.holdExpiresAt)
    : null;
  const codOffered = codAllowedFor(settings, order.total - order.codFee);
  return (
    <CheckoutShell>
      <div className="grid grid-cols-1 gap-8 desk:grid-cols-[1fr_27.5rem] desk:gap-14">
        <div className="flex flex-col gap-6">
          <ResultIcon tone="alert" />
          <ResultTag
            label="Payment unsuccessful"
            note="Happens to the best of us"
          />
          <h1 className="font-display text-[length:max(3rem,34px)] font-bold uppercase leading-[0.95]">
            That didn&apos;t go through.
          </h1>
          <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.6]">
            Don&apos;t worry, no money has been taken. If your bank did debit
            you, it&apos;ll be refunded automatically within 5 to 7 working
            days.
          </p>
          {reason ? (
            <p className="rounded-[1.25rem] bg-onwei-blue px-5 py-4 font-grotesk text-[length:max(0.875rem,12px)] text-onwei-beige">
              <span className="font-bold">What happened: </span>
              {reason}
            </p>
          ) : null}
          <p className="flex items-center gap-3 rounded-full border border-onwei-blue px-5 py-3 font-grotesk text-[length:max(0.8125rem,11px)]">
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-onwei-blue font-bold text-onwei-beige"
            >
              !
            </span>
            {held && minutesLeft
              ? `We're holding your items for ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}.`
              : "The hold on your items has ended, but your bag is saved. Start again to check out."}
          </p>
          {reason ? null : (
            <Card>
              <h2 className="mb-3 font-display text-[length:max(1.125rem,14px)] font-bold">
                What usually causes this
              </h2>
              <ul className="flex flex-col gap-2 font-grotesk text-[length:max(0.8125rem,11px)]">
                {CAUSES.map((cause) => (
                  <li key={cause} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-onwei-blue"
                    />
                    {cause}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {held ? (
            <RetryPayment
              orderNumber={order.orderNumber}
              primaryLabel="Try payment again"
              secondary={{ label: "Use another method", href: "/checkout" }}
              prefill={{
                name: order.address?.fullName,
                email: order.contactEmail,
                contact: order.address?.phone ?? order.contactPhone,
              }}
            />
          ) : (
            <Link
              href="/checkout"
              className="flex h-12 w-fit items-center justify-center rounded-full bg-onwei-blue px-7 font-grotesk text-[length:max(0.8125rem,11px)] uppercase tracking-[0.04em] text-onwei-beige"
            >
              Start again
            </Link>
          )}
          {codOffered ? (
            <Link
              href="/checkout?pay=cod"
              className="w-fit font-grotesk text-[length:max(0.8125rem,11px)] underline underline-offset-4"
            >
              Pay on delivery instead
              {settings.codFee > 0 ? ` (adds ${rupees(settings.codFee)})` : ""}
            </Link>
          ) : null}
          <p className="font-grotesk text-[length:max(0.75rem,11px)]">
            Your bag&apos;s saved, so you won&apos;t lose anything.
          </p>
          <HelpCard
            title="Still not working?"
            body="Get in touch and we'll help you complete your order."
          />
        </div>
        <div className="desk:self-start">
          <OrderSummaryCard
            order={order}
            badge="Not paid"
            totalLabel="Amount due"
          />
        </div>
      </div>
    </CheckoutShell>
  );
}
