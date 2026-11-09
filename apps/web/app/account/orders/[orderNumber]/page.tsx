import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerOrder, getStoreSettings } from "@onwei/core";
import { getSession } from "../../../../lib/session";
import {
  ORDER_STATUS_LABELS,
  RETURN_BLOCKED_LABELS,
  RETURN_STATUS_LABELS,
  rupees,
} from "../../../../lib/messages/commerce";
import {
  CheckoutShell,
  HelpCard,
} from "../../../checkout/_components/CheckoutShell";
import { Card } from "../../../checkout/_components/parts";
import {
  OrderDetailsCard,
  OrderProgress,
  OrderSummaryCard,
} from "../../../checkout/_components/ResultParts";
import { RetryPayment } from "../../../checkout/_components/RetryPayment";
import { ReturnForm } from "./ReturnForm";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await getSession();
  if (!session)
    redirect(`/login?next=/account/orders/${encodeURIComponent(orderNumber)}`);
  const [order, settings] = await Promise.all([
    getCustomerOrder(session.customerId, orderNumber),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const heading = order.awaitingPayment
    ? "Waiting for payment"
    : order.status === "DELIVERED"
      ? "Delivered"
      : order.status === "CANCELLED"
        ? "Cancelled"
        : ORDER_STATUS_LABELS[order.status];

  return (
    <CheckoutShell header="site">
      <div className="grid grid-cols-1 gap-8 desk:grid-cols-[1fr_27.5rem] desk:gap-14">
        <div className="flex flex-col gap-6">
          <Link
            href="/account"
            className="w-fit font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-2"
          >
            ← All orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-onwei-blue px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em] text-onwei-beige">
              Order #{order.orderNumber}
            </span>
            <span className="font-grotesk text-[length:max(0.75rem,11px)]">
              Placed {DATE.format(order.placedAt)}
            </span>
          </div>
          <h1 className="font-display text-[length:max(3rem,34px)] font-bold uppercase leading-[0.95]">
            {heading}
          </h1>

          {order.awaitingPayment ? (
            <RetryPayment
              orderNumber={order.orderNumber}
              primaryLabel="Complete payment"
              secondary={{ label: "Back to bag", href: "/checkout" }}
              prefill={{
                name: order.address?.fullName,
                email: order.contactEmail,
                contact: order.address?.phone,
              }}
            />
          ) : order.status !== "CANCELLED" ? (
            <OrderProgress status={order.status} />
          ) : null}

          {order.trackingNumber ? (
            <p className="rounded-[1rem] bg-onwei-white px-5 py-3 font-grotesk text-[length:max(0.875rem,12px)]">
              Shipped with {order.courierName}. Tracking number{" "}
              <span className="font-bold">{order.trackingNumber}</span>.
            </p>
          ) : null}

          <OrderDetailsCard order={order} />

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
              Items
            </h2>
            <ul className="flex flex-col gap-2">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 font-grotesk text-[length:max(0.8125rem,11px)]"
                >
                  <span>
                    {item.productName}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""} ×{" "}
                    {item.quantity}
                  </span>
                  <span className="text-onwei-blue/70">
                    {item.returnBlockedReason &&
                    order.status !== "PENDING" &&
                    order.status !== "CANCELLED"
                      ? RETURN_BLOCKED_LABELS[item.returnBlockedReason]
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {order.returns.length ? (
            <Card className="flex flex-col gap-3">
              <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
                Your returns
              </h2>
              <ul className="flex flex-col gap-2">
                {order.returns.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-0.5 font-grotesk text-[length:max(0.8125rem,11px)]"
                  >
                    <span>
                      {r.productName} × {r.quantity}:{" "}
                      <span className="font-bold">
                        {RETURN_STATUS_LABELS[r.status]}
                      </span>
                      {r.resolution === "REFUND" && r.refundAmount
                        ? ` (refund ${rupees(r.refundAmount)})`
                        : r.resolution === "EXCHANGE"
                          ? " (exchange)"
                          : ""}
                    </span>
                    {r.rejectionReason ? (
                      <span className="text-onwei-blue/80">
                        {r.rejectionReason}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <ReturnForm
            orderNumber={order.orderNumber}
            items={order.items}
            reasons={settings.returnReasons}
            allowRefund={settings.returnsAllowRefund}
            allowExchange={settings.returnsAllowExchange}
            isCod={order.paymentMethod === "COD"}
            conditionNote={settings.returnConditionNote}
            shippingNote={settings.returnShippingNote}
            windowEnds={
              order.returnWindowEndsAt
                ? DATE.format(order.returnWindowEndsAt)
                : null
            }
          />

          <HelpCard
            title="Questions about your order?"
            body="Get in touch and we'll get back to you within a day."
          />
        </div>
        <div className="desk:self-start">
          <OrderSummaryCard
            order={order}
            badge={
              order.paymentMethod === "COD"
                ? "Cash on delivery"
                : order.awaitingPayment
                  ? "Not paid"
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
