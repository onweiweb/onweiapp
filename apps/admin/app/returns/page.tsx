import Link from "next/link";
import { formatCurrency } from "@onwei/core";
import { prisma, type ReturnStatus } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import { RETURN_STATUS_LABELS } from "../_lib/orderStatusLabels";
import { ReturnSteps } from "../_components/OrderActions";
import {
  AdminBadge,
  AdminPager,
  AdminTabLinks,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  returnStatusTone,
  PageHeader,
} from "../_components/ui";

const OPEN: ReturnStatus[] = ["REQUESTED", "APPROVED", "PICKED_UP", "RECEIVED"];
const TABS = [
  { id: "open", label: "Needs action" },
  { id: "done", label: "Finished" },
] as const;

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  await requirePageSession("return:view");
  const { tab: tabParam, page: pageParam } = await searchParams;
  const tab = tabParam === "done" ? "done" : "open";
  const page = parsePage(pageParam);

  const fetched = await prisma.returnRequest.findMany({
    where: { status: tab === "open" ? { in: OPEN } : { notIn: OPEN } },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          paymentMethod: true,
          customer: { select: { name: true, email: true } },
        },
      },
      orderItem: { select: { productName: true, sku: true } },
    },
    orderBy: [{ requestedAt: tab === "open" ? "asc" : "desc" }, { id: "asc" }],
    ...pageWindow(page),
  });
  const { rows, hasNext } = trimPage(fetched);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Returns"
        description="Customers ask for returns from their order page. Approve or reject, mark it picked up and received, then refund or send the exchange. Stock goes back only when you mark it received in good condition."
      />
      <AdminTabLinks basePath="/returns" tabs={TABS} active={tab} />

      {rows.length === 0 ? (
        <EmptyState
          title={
            tab === "open"
              ? "Nothing waiting on you"
              : "No finished returns yet"
          }
          description={
            tab === "open" ? "New return requests show up here." : undefined
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Order</AdminTableHeaderCell>
            <AdminTableHeaderCell>Item</AdminTableHeaderCell>
            <AdminTableHeaderCell>Reason</AdminTableHeaderCell>
            <AdminTableHeaderCell>Wants</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Next step</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {rows.map((r) => {
              const refund = r.refundAmount
                ? formatCurrency(Math.round(Number(r.refundAmount) * 100))
                : "";
              return (
                <AdminTableRow key={r.id}>
                  <AdminTableCell>
                    <Link
                      href={`/orders/${r.order.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {r.order.orderNumber}
                    </Link>
                    <span className="block text-xs text-onwei-blue/60">
                      {r.order.customer.name ?? r.order.customer.email ?? ""}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.orderItem.productName || r.orderItem.sku} × {r.quantity}
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.reason}
                    {r.customerNote ? (
                      <span className="block text-xs text-onwei-blue/60">
                        {r.customerNote}
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.resolution === "EXCHANGE"
                      ? "Exchange"
                      : `Refund ${refund}`}
                    {r.payoutUpi ? (
                      <span className="block text-xs text-onwei-blue/60">
                        UPI {r.payoutUpi}
                      </span>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone={returnStatusTone(r.status)}>
                      {RETURN_STATUS_LABELS[r.status]}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <ReturnSteps
                      returnId={r.id}
                      status={r.status}
                      resolution={r.resolution}
                      refundLabel={refund}
                    />
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      <AdminPager
        pathname="/returns"
        page={page}
        hasNext={hasNext}
        params={{ tab }}
      />
    </main>
  );
}
