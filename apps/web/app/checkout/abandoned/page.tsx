import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutShell, HelpCard } from "../_components/CheckoutShell";
import { CheckoutSteps } from "../_components/parts";
import { loadResultOrder } from "../_components/loadOrder";
import {
  OrderDetailsCard,
  OrderSummaryCard,
  ResultIcon,
  ResultTag,
} from "../_components/ResultParts";
import { RetryPayment } from "../_components/RetryPayment";

export const metadata: Metadata = {
  title: "Checkout not completed",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Figma "Checkout – Abandoned" (1257:7695 desktop, 1257:8202 mobile). Shown
// when the payment window is closed without paying. The Figma banner says
// items "aren't reserved"; we hold them for a short while, so the line says
// that instead (truthful copy over the mock).
export default async function CheckoutAbandonedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await loadResultOrder(searchParams);
  if (order.status !== "PENDING" && order.status !== "CANCELLED") {
    redirect(`/checkout/success?order=${order.orderNumber}`);
  }
  const preorder = order.preorder !== null;
  return (
    <CheckoutShell>
      <div className="grid grid-cols-1 gap-8 desk:grid-cols-[1fr_27.5rem] desk:gap-14">
        <div className="flex flex-col gap-6">
          <ResultIcon tone="alert" />
          <ResultTag label="Checkout not completed" note="Still thinking?" />
          <h1 className="font-display text-[length:max(3rem,34px)] font-bold uppercase leading-[0.95]">
            You left something behind.
          </h1>
          <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.6]">
            {preorder
              ? "Your pre-order isn't reserved yet. Pay the reserve to keep your spot at this lap's price."
              : "Your bag's saved, just how you left it. Pick up where you stopped and check out in a couple of taps."}
          </p>
          <p className="flex items-center gap-3 rounded-full bg-onwei-blue px-5 py-3 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-beige">
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-onwei-green font-bold text-onwei-blue"
            >
              !
            </span>
            {order.awaitingPayment
              ? "We're holding your items for a few minutes. After that they go back on sale."
              : preorder
                ? "The hold has ended. Start again from the product to reserve it."
                : "Items in your bag aren't reserved until you complete checkout."}
          </p>
          <CheckoutSteps current={2} />
          <OrderDetailsCard order={order} title="Your details" />
          <RetryPayment
            orderNumber={order.orderNumber}
            primaryLabel={preorder ? "Pay the reserve" : "Complete checkout"}
            secondary={{
              label: preorder ? "See pre-orders" : "Continue shopping",
              href: "/collection/all",
            }}
            prefill={{
              name: order.address?.fullName,
              email: order.contactEmail,
              contact: order.address?.phone ?? order.contactPhone,
            }}
          />
          <HelpCard
            title="Need a hand checking out?"
            body="Get in touch and we'll help you finish your order."
          />
        </div>
        <div className="desk:self-start">
          <OrderSummaryCard
            order={order}
            badge={preorder ? "Pre-order" : "In your cart"}
            totalLabel={preorder ? "Pay now to reserve" : "Total"}
          />
        </div>
      </div>
    </CheckoutShell>
  );
}
