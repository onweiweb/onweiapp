import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

// Figma "Checkout – Payment failed" (1257:7520 desktop, 1257:8064 mobile).
export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await loadResultOrder(searchParams);
  if (order.status !== "PENDING" && order.status !== "CANCELLED") {
    redirect(`/checkout/success?order=${order.orderNumber}`);
  }
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
