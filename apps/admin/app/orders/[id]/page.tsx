import { notFound } from "next/navigation";
import { nextStatuses } from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RETURN_STATUS_LABELS,
} from "../../_lib/orderStatusLabels";
import { OrderStatusForm } from "../../_components/OrderStatusForm";
import { ReturnActionButtons } from "../../_components/ReturnActionButtons";
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
} from "../../_components/ui";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession("order:view");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { productVariant: { include: { product: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      returnRequests: {
        include: { orderItem: { include: { productVariant: true } } },
      },
    },
  });

  if (!order) notFound();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold uppercase">
            Order {order.orderNumber}
          </h1>
          <p className="text-sm text-onwei-blue/70">
            {order.customer.name ?? order.customer.email ?? "Unknown customer"}
            {" · "}
            {order.placedAt.toLocaleString()}
          </p>
        </div>
        <AdminBadge tone={orderStatusTone(order.status)}>
          {ORDER_STATUS_LABELS[order.status]}
        </AdminBadge>
      </div>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Change status
        </h2>
        <OrderStatusForm
          orderId={order.id}
          nextStatuses={nextStatuses(order.status)}
          statusLabels={ORDER_STATUS_LABELS}
        />
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Line items
        </h2>
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Product</AdminTableHeaderCell>
            <AdminTableHeaderCell>SKU</AdminTableHeaderCell>
            <AdminTableHeaderCell>Qty</AdminTableHeaderCell>
            <AdminTableHeaderCell>Unit price</AdminTableHeaderCell>
            <AdminTableHeaderCell>Total</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {order.items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>
                  {item.productVariant.product.name}
                </AdminTableCell>
                <AdminTableCell className="font-mono">
                  {item.productVariant.sku}
                </AdminTableCell>
                <AdminTableCell>{item.quantity}</AdminTableCell>
                <AdminTableCell>{item.unitPrice.toString()}</AdminTableCell>
                <AdminTableCell>{item.totalAmount.toString()}</AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Status history
        </h2>
        {order.statusHistory.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">No history yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {order.statusHistory.map((entry) => (
              <li key={entry.id} className="text-sm">
                <AdminBadge tone={orderStatusTone(entry.status)}>
                  {ORDER_STATUS_LABELS[entry.status]}
                </AdminBadge>
                <span className="ml-2 text-onwei-blue/60">
                  {entry.createdAt.toLocaleString()}
                  {entry.note ? ` — ${entry.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Payments
        </h2>
        {order.payments.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">
            No payment records yet for this order.
          </p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Provider</AdminTableHeaderCell>
              <AdminTableHeaderCell>Reference</AdminTableHeaderCell>
              <AdminTableHeaderCell>Amount</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {order.payments.map((payment) => (
                <AdminTableRow key={payment.id}>
                  <AdminTableCell>{payment.provider}</AdminTableCell>
                  <AdminTableCell className="font-mono">
                    {payment.providerPaymentId}
                  </AdminTableCell>
                  <AdminTableCell>{payment.amount.toString()}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone={paymentStatusTone(payment.status)}>
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </AdminBadge>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Returns
        </h2>
        {order.returnRequests.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">
            No returns have been requested on this order.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {order.returnRequests.map((returnRequest) => (
              <li
                key={returnRequest.id}
                className="flex items-center justify-between gap-4 border-t border-onwei-beige pt-3 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {returnRequest.orderItem.productVariant.sku} —{" "}
                    {returnRequest.reason}
                  </p>
                  <AdminBadge tone={returnStatusTone(returnRequest.status)}>
                    {RETURN_STATUS_LABELS[returnRequest.status]}
                  </AdminBadge>
                </div>
                {returnRequest.status === "REQUESTED" ? (
                  <ReturnActionButtons
                    returnRequestId={returnRequest.id}
                    sku={returnRequest.orderItem.productVariant.sku}
                    quantity={
                      order.items.find(
                        (item) => item.id === returnRequest.orderItemId,
                      )?.quantity ?? 1
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </main>
  );
}
