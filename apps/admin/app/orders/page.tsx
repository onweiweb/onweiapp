import Link from "next/link";
import { prisma } from "@onwei/database";
import type { OrderStatus } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { ORDER_STATUS_LABELS } from "../_lib/orderStatusLabels";
import {
  AdminBadge,
  AdminButton,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  orderStatusTone,
} from "../_components/ui";

const STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePageSession("order:view");
  const { status } = await searchParams;
  const statusFilter = STATUS_OPTIONS.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { customer: true },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold uppercase">
          Orders
        </h1>
        <form className="flex items-center gap-2">
          <AdminSelect name="status" defaultValue={statusFilter ?? ""}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ORDER_STATUS_LABELS[option]}
              </option>
            ))}
          </AdminSelect>
          <AdminButton type="submit" variant="secondary">
            Filter
          </AdminButton>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="text-onwei-blue/70">
          {statusFilter
            ? `No orders are currently ${ORDER_STATUS_LABELS[statusFilter].toLowerCase()}.`
            : "No orders yet — they'll show up here once a customer checks out."}
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Order</AdminTableHeaderCell>
            <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
            <AdminTableHeaderCell>Placed</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Total</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {orders.map((order) => (
              <AdminTableRow key={order.id}>
                <AdminTableCell>
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </AdminTableCell>
                <AdminTableCell>
                  {order.customer.name ?? order.customer.email ?? "—"}
                </AdminTableCell>
                <AdminTableCell>
                  {order.placedAt.toLocaleDateString()}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={orderStatusTone(order.status)}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  {order.currency} {order.total.toString()}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
