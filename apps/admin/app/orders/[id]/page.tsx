import { notFound } from "next/navigation";
import { hasPermission } from "@onwei/auth";
import {
  formatCurrency,
  nextStatuses,
  refundableAmount,
  type AddressSnapshot,
} from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RETURN_STATUS_LABELS,
} from "../../_lib/orderStatusLabels";
import { OrderStatusForm } from "../../_components/OrderStatusForm";
import {
  CancelOrderForm,
  RefundForm,
  ReturnSteps,
  ShipForm,
  SimpleOrderAction,
} from "../../_components/OrderActions";
import {
  AdminBadge,
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  orderStatusTone,
  paymentStatusTone,
  returnStatusTone,
  PageHeader,
} from "../../_components/ui";

const money = (value: { toString(): string } | number) =>
  formatCurrency(Math.round(Number(value.toString()) * 100));

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
      {children}
    </h2>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requirePageSession("order:view");
  const canUpdate = hasPermission(staff.permissions, "order:updateStatus");
  const canRefund = hasPermission(staff.permissions, "order:refund");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { productVariant: true }, orderBy: { id: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      discounts: true,
      refunds: { orderBy: { createdAt: "desc" } },
      returnRequests: {
        include: { orderItem: true },
        orderBy: { requestedAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  const address =
    order.shippingAddressSnapshot as unknown as AddressSnapshot | null;
  const left = await refundableAmount(order.id);
  const isCod = order.paymentMethod === "COD";
  // Staff move orders forward here; shipping has its own form (it needs the
  // tracking number) and cancelling has its own (it refunds).
  const simpleNext = nextStatuses(order.status).filter(
    (s) =>
      s !== "SHIPPED" &&
      s !== "CANCELLED" &&
      s !== "REFUNDED" &&
      s !== "RETURN_REQUESTED" &&
      s !== "RETURNED",
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        title={`Order ${order.orderNumber}`}
        description={`${order.customer.name ?? order.contactEmail ?? order.contactPhone ?? "Customer"} · ${order.placedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · ${isCod ? "Cash on delivery" : "Paid online"}`}
        actions={
          <AdminBadge tone={orderStatusTone(order.status)}>
            {ORDER_STATUS_LABELS[order.status]}
          </AdminBadge>
        }
      />

      {order.needsAttention ? (
        <AdminCard className="flex flex-wrap items-center justify-between gap-3 border-2 border-onwei-black">
          <p className="text-sm font-semibold text-onwei-black">
            {order.needsAttention}
          </p>
          {canUpdate ? (
            <SimpleOrderAction
              orderId={order.id}
              path="attention"
              label="Mark as handled"
              done="Cleared."
            />
          ) : null}
        </AdminCard>
      ) : null}

      {canUpdate &&
      (order.status === "CONFIRMED" || order.status === "PACKED") ? (
        <AdminCard className="flex flex-col gap-4">
          <Heading>Ship it</Heading>
          <ShipForm orderId={order.id} />
        </AdminCard>
      ) : null}

      {canUpdate && simpleNext.length > 0 && order.status !== "PENDING" ? (
        <AdminCard>
          <Heading>Move to the next step</Heading>
          <OrderStatusForm
            orderId={order.id}
            nextStatuses={simpleNext}
            statusLabels={ORDER_STATUS_LABELS}
          />
        </AdminCard>
      ) : null}

      {order.status === "PENDING" ? (
        <AdminCard>
          <p className="text-sm text-onwei-blue/80">
            Waiting for the customer to pay. If they don&apos;t, the order
            cancels itself
            {order.reservationExpiresAt
              ? ` at ${order.reservationExpiresAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}`
              : ""}{" "}
            and the items go back on sale. Nothing to do here.
          </p>
        </AdminCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <Heading>Deliver to</Heading>
          {address ? (
            <p className="text-sm leading-6">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.postalCode}
              <br />
              {address.phone}
            </p>
          ) : (
            <p className="text-sm text-onwei-blue/60">
              No address saved on this order.
            </p>
          )}
          <p className="mt-3 text-sm">
            Contact:{" "}
            {[order.contactEmail, order.contactPhone]
              .filter(Boolean)
              .join(" · ") || "-"}
          </p>
          {order.trackingNumber ? (
            <p className="mt-2 text-sm">
              Shipped with {order.courierName}, tracking {order.trackingNumber}
            </p>
          ) : null}
        </AdminCard>

        <AdminCard>
          <Heading>Money</Heading>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            {order.discounts.map((d) => (
              <div key={d.id} className="flex justify-between">
                <dt>
                  {d.label}
                  {d.code ? ` (${d.code})` : ""}
                </dt>
                <dd>
                  {d.freeShipping ? "Free delivery" : `−${money(d.amount)}`}
                </dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>
                {Number(order.shippingTotal) === 0
                  ? "Free"
                  : money(order.shippingTotal)}
              </dd>
            </div>
            {Number(order.codFee) > 0 ? (
              <div className="flex justify-between">
                <dt>Cash on delivery fee</dt>
                <dd>{money(order.codFee)}</dd>
              </div>
            ) : null}
            {Number(order.taxTotal) > 0 ? (
              <div className="flex justify-between text-onwei-blue/70">
                <dt>GST included</dt>
                <dd>{money(order.taxTotal)}</dd>
              </div>
            ) : (
              <div className="flex justify-between text-onwei-blue/70">
                <dt>GST</dt>
                <dd>Included (set GST rates on products to see it)</dd>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-onwei-blue/10 pt-2 font-semibold">
              <dt>Total</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
          {isCod ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {order.codCollectedAt ? (
                <AdminBadge tone="success">Cash collected</AdminBadge>
              ) : (
                <>
                  <AdminBadge tone="pending">Cash to collect</AdminBadge>
                  {canUpdate &&
                  ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
                    order.status,
                  ) ? (
                    <SimpleOrderAction
                      orderId={order.id}
                      path="cod-collected"
                      label="Cash collected"
                      confirmTitle="Mark cash as collected?"
                      confirmMessage={`Confirm the courier handed over ${money(order.total)}.`}
                      done="Marked as collected."
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </AdminCard>
      </div>

      <AdminCard>
        <Heading>Items</Heading>
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Product</AdminTableHeaderCell>
            <AdminTableHeaderCell>SKU</AdminTableHeaderCell>
            <AdminTableHeaderCell>Qty</AdminTableHeaderCell>
            <AdminTableHeaderCell>Price each</AdminTableHeaderCell>
            <AdminTableHeaderCell>Discount</AdminTableHeaderCell>
            <AdminTableHeaderCell>Paid</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {order.items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>
                  {item.productName || item.productVariant.sku}
                  {item.variantLabel ? (
                    <span className="block text-xs text-onwei-blue/60">
                      {item.variantLabel}
                    </span>
                  ) : null}
                </AdminTableCell>
                <AdminTableCell className="font-mono">
                  {item.sku || item.productVariant.sku}
                </AdminTableCell>
                <AdminTableCell>{item.quantity}</AdminTableCell>
                <AdminTableCell>{money(item.unitPrice)}</AdminTableCell>
                <AdminTableCell>
                  {Number(item.discountAmount)
                    ? `−${money(item.discountAmount)}`
                    : "-"}
                </AdminTableCell>
                <AdminTableCell>{money(item.totalAmount)}</AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      </AdminCard>

      <AdminCard>
        <Heading>Returns</Heading>
        {order.returnRequests.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">
            No returns have been asked for on this order.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {order.returnRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 border-t border-onwei-beige pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge tone={returnStatusTone(r.status)}>
                    {RETURN_STATUS_LABELS[r.status]}
                  </AdminBadge>
                  <span className="text-sm font-medium">
                    {r.orderItem.productName} × {r.quantity}: {r.reason}
                  </span>
                  <span className="text-sm text-onwei-blue/70">
                    {r.resolution === "EXCHANGE"
                      ? "wants an exchange"
                      : `refund ${r.refundAmount ? money(r.refundAmount) : ""}`}
                    {r.payoutUpi ? ` to UPI ${r.payoutUpi}` : ""}
                  </span>
                </div>
                {r.customerNote ? (
                  <p className="text-sm text-onwei-blue/80">
                    Customer says: {r.customerNote}
                  </p>
                ) : null}
                {r.rejectionReason ? (
                  <p className="text-sm text-onwei-blue/80">
                    Rejected: {r.rejectionReason}
                  </p>
                ) : null}
                <ReturnSteps
                  returnId={r.id}
                  status={r.status}
                  resolution={r.resolution}
                  refundLabel={r.refundAmount ? money(r.refundAmount) : ""}
                />
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard>
        <Heading>Payments and refunds</Heading>
        {order.payments.length === 0 && order.refunds.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">No payments yet.</p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>What</AdminTableHeaderCell>
              <AdminTableHeaderCell>Reference</AdminTableHeaderCell>
              <AdminTableHeaderCell>Amount</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {order.payments.map((payment) => (
                <AdminTableRow key={payment.id}>
                  <AdminTableCell>
                    Payment (
                    {payment.provider === "cod"
                      ? "cash"
                      : (payment.method ?? payment.provider)}
                    )
                    {payment.errorReason ? (
                      <span className="block text-xs text-onwei-blue/60">
                        {payment.errorReason}
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell className="font-mono">
                    {payment.providerPaymentId}
                  </AdminTableCell>
                  <AdminTableCell>
                    {money(payment.amount)}
                    {Number(payment.refundedAmount) > 0 ? (
                      <span className="block text-xs">
                        refunded {money(payment.refundedAmount)}
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone={paymentStatusTone(payment.status)}>
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </AdminBadge>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
              {order.refunds.map((refund) => (
                <AdminTableRow key={refund.id}>
                  <AdminTableCell>
                    Refund (
                    {refund.method === "MANUAL" ? "by staff" : "Razorpay"})
                    {refund.note ? (
                      <span className="block text-xs text-onwei-blue/60">
                        {refund.note}
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell className="font-mono">
                    {refund.providerRefundId ?? "-"}
                  </AdminTableCell>
                  <AdminTableCell>−{money(refund.amount)}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge
                      tone={
                        refund.status === "FAILED"
                          ? "problem"
                          : refund.status === "PENDING"
                            ? "pending"
                            : "success"
                      }
                    >
                      {refund.status === "PROCESSED"
                        ? "Done"
                        : refund.status === "PENDING"
                          ? "On its way"
                          : "Failed"}
                    </AdminBadge>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
        {canRefund && !isCod && left > 0 ? (
          <div className="mt-4 border-t border-onwei-blue/10 pt-4">
            <p className="mb-2 text-sm text-onwei-blue/70">
              Give money back without a return (for example, goodwill).
            </p>
            <RefundForm orderId={order.id} maxRupees={left / 100} />
          </div>
        ) : null}
      </AdminCard>

      {canRefund &&
      (order.status === "CONFIRMED" || order.status === "PACKED") ? (
        <AdminCard>
          <Heading>Cancel order</Heading>
          <CancelOrderForm
            orderId={order.id}
            paidOnline={!isCod && Boolean(order.paidAt)}
          />
        </AdminCard>
      ) : null}

      <AdminCard>
        <Heading>History</Heading>
        <ul className="flex flex-col gap-2">
          {order.statusHistory.map((entry) => (
            <li key={entry.id} className="text-sm">
              <AdminBadge tone={orderStatusTone(entry.status)}>
                {ORDER_STATUS_LABELS[entry.status]}
              </AdminBadge>
              <span className="ml-2 text-onwei-blue/60">
                {entry.createdAt.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
                {entry.note ? `, ${entry.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </main>
  );
}
