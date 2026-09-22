import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { ReturnActionButtons } from "../_components/ReturnActionButtons";
import {
  AdminBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  returnStatusTone,
} from "../_components/ui";

export default async function ReturnsPage() {
  await requirePageSession("return:view");

  const returnRequests = await prisma.returnRequest.findMany({
    where: { status: "REQUESTED" },
    include: {
      order: { include: { customer: true } },
      orderItem: {
        include: { productVariant: { include: { product: true } } },
      },
    },
    orderBy: { requestedAt: "asc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">Returns</h1>

      {returnRequests.length === 0 ? (
        <p className="text-onwei-blue/70">
          Nothing waiting on you — new return requests will show up here.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Order</AdminTableHeaderCell>
            <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
            <AdminTableHeaderCell>Product</AdminTableHeaderCell>
            <AdminTableHeaderCell>Reason</AdminTableHeaderCell>
            <AdminTableHeaderCell>Requested</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {returnRequests.map((returnRequest) => (
              <AdminTableRow key={returnRequest.id}>
                <AdminTableCell>
                  <Link
                    href={`/orders/${returnRequest.orderId}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {returnRequest.order.orderNumber}
                  </Link>
                </AdminTableCell>
                <AdminTableCell>
                  {returnRequest.order.customer.name ??
                    returnRequest.order.customer.email ??
                    "—"}
                </AdminTableCell>
                <AdminTableCell>
                  {returnRequest.orderItem.productVariant.product.name}
                  <span className="ml-1 font-mono text-xs text-onwei-blue/60">
                    ({returnRequest.orderItem.productVariant.sku})
                  </span>
                </AdminTableCell>
                <AdminTableCell>{returnRequest.reason}</AdminTableCell>
                <AdminTableCell>
                  {returnRequest.requestedAt.toLocaleDateString()}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={returnStatusTone(returnRequest.status)}>
                    Requested
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  <ReturnActionButtons
                    returnRequestId={returnRequest.id}
                    sku={returnRequest.orderItem.productVariant.sku}
                    quantity={returnRequest.orderItem.quantity}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
