import type { OrderDetail } from "@onwei/core";
import { ProductImage } from "@/_components/ProductImage";
import { rupees } from "../../../lib/messages/commerce";
import { Card } from "./parts";

/** Round icon at the top of a result page: tick, or "!" for problems. */
export function ResultIcon({ tone }: { tone: "ok" | "alert" }) {
  return (
    <span
      aria-hidden
      className="flex size-14 items-center justify-center rounded-full bg-onwei-blue text-onwei-green"
    >
      {tone === "ok" ? (
        <svg viewBox="0 0 16 16" className="size-6 fill-current">
          <path d="M6.2 11.6 2.6 8l1.1-1.1 2.5 2.5 6.1-6.1 1.1 1.1z" />
        </svg>
      ) : (
        <span className="font-display text-2xl font-bold">!</span>
      )}
    </span>
  );
}

/** Navy pill plus the handwritten note next to it (Figma). */
export function ResultTag({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-onwei-blue px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em] text-onwei-beige">
        {label}
      </span>
      <span className="font-script text-[length:max(1.125rem,15px)] uppercase">
        {note}
      </span>
    </div>
  );
}

const PROGRESS = [
  {
    label: "Order placed",
    reached: [
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ],
  },
  {
    label: "Packing",
    reached: ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"],
  },
  { label: "Shipped", reached: ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] },
  { label: "Delivered", reached: ["DELIVERED"] },
];

/** Placed, packing, shipped, delivered. Done steps ticked, the next one dotted. */
export function OrderProgress({ status }: { status: string }) {
  const doneCount = PROGRESS.filter((step) =>
    step.reached.includes(status),
  ).length;
  return (
    <ol
      className="flex w-full max-w-[32rem] items-start"
      aria-label="Order progress"
    >
      {PROGRESS.map((step, index) => {
        const done = index < doneCount;
        const next = index === doneCount;
        return (
          <li
            key={step.label}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {index > 0 ? (
              <span
                aria-hidden
                className="absolute right-1/2 top-3 h-px w-full bg-onwei-blue"
              />
            ) : null}
            <span
              className={`relative z-10 flex size-6 items-center justify-center rounded-full border border-onwei-blue ${done ? "bg-onwei-blue text-onwei-green" : "bg-onwei-white"}`}
            >
              {done ? (
                <svg
                  viewBox="0 0 16 16"
                  className="size-3 fill-current"
                  aria-hidden
                >
                  <path d="M6.2 11.6 2.6 8l1.1-1.1 2.5 2.5 6.1-6.1 1.1 1.1z" />
                </svg>
              ) : next ? (
                <span className="size-2.5 rounded-full bg-onwei-blue" />
              ) : null}
            </span>
            <span className="text-center font-grotesk text-[length:max(0.6875rem,10px)] uppercase">
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetailsCard({
  order,
  title = "Order details",
}: {
  order: OrderDetail;
  title?: string;
}) {
  const a = order.address;
  const label =
    "font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]";
  const text = "font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.5]";
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 desk:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <p className={label}>Contact</p>
            <p className={text}>{order.contactEmail ?? order.contactPhone}</p>
          </div>
          <div>
            <p className={label}>Delivery</p>
            <p className={text}>
              Standard delivery
              <br />3 to 5 working days
            </p>
          </div>
          {order.trackingNumber ? (
            <div>
              <p className={label}>Tracking</p>
              <p className={text}>
                {order.courierName} {order.trackingNumber}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          {a ? (
            <div>
              <p className={label}>Shipping address</p>
              <p className={text}>
                {a.fullName}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.postalCode}
              </p>
            </div>
          ) : null}
          <div>
            <p className={label}>Payment</p>
            <p className={text}>
              {order.paymentLabel}
              <br />
              {order.paymentMethod === "COD"
                ? `${rupees(order.total)} to pay on delivery`
                : order.awaitingPayment || order.status === "PENDING"
                  ? "Not paid"
                  : `${rupees(order.total)} paid`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function OrderSummaryCard({
  order,
  badge,
  totalLabel,
}: {
  order: OrderDetail;
  badge: string;
  totalLabel: string;
}) {
  const row =
    "flex justify-between font-grotesk text-[length:max(0.8125rem,11px)]";
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[length:max(1.125rem,14px)] font-bold">
          Order summary
        </h2>
        <span className="rounded-full border border-onwei-blue bg-onwei-green px-3 py-0.5 font-grotesk text-[length:max(0.6875rem,10px)] uppercase">
          {badge}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[0.75rem] bg-onwei-green">
              <ProductImage
                src={item.imageUrl ?? undefined}
                alt={item.productName}
                fill
                sizes="56px"
                className="object-cover"
              />
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-onwei-blue font-grotesk text-[0.625rem] text-onwei-beige">
                {item.quantity}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[length:max(0.875rem,12px)] font-semibold">
                {item.productName}
              </span>
              <span className="block font-grotesk text-[length:max(0.6875rem,10px)]">
                {item.variantLabel}
              </span>
            </span>
            <span className="font-grotesk text-[length:max(0.8125rem,11px)]">
              {rupees(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-1.5 border-t border-onwei-blue pt-3">
        <div className={row}>
          <dt>Subtotal</dt>
          <dd>{rupees(order.subtotal)}</dd>
        </div>
        {order.discounts
          .filter((d) => d.amount > 0)
          .map((d) => (
            <div key={d.label} className={row}>
              <dt>{d.label}</dt>
              <dd>−{rupees(d.amount)}</dd>
            </div>
          ))}
        <div className={row}>
          <dt>Shipping</dt>
          <dd>
            {order.shippingFee === 0 ? "Free" : rupees(order.shippingFee)}
          </dd>
        </div>
        {order.codFee > 0 ? (
          <div className={row}>
            <dt>Cash on delivery fee</dt>
            <dd>{rupees(order.codFee)}</dd>
          </div>
        ) : null}
        <div className={row}>
          <dt>Taxes</dt>
          <dd>Included</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between border-t border-onwei-blue pt-3">
        <span className="font-display text-[length:max(1rem,13px)] font-bold">
          {totalLabel}
        </span>
        <span className="font-display text-[length:max(1.375rem,18px)] font-bold">
          {rupees(order.total)}
        </span>
      </div>
    </Card>
  );
}
