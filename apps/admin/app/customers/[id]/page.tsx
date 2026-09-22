import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { ORDER_STATUS_LABELS } from "../../_lib/orderStatusLabels";
import {
  CONSENT_TYPE_LABELS,
  DSR_STATUS_LABELS,
  DSR_TYPE_LABELS,
} from "../../_lib/complianceLabels";
import { DsrStatusForm } from "../../_components/DsrStatusForm";
import {
  AdminBadge,
  AdminCard,
  orderStatusTone,
  dsrStatusTone,
} from "../../_components/ui";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession("customer:view");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: { orderBy: { placedAt: "desc" } },
      consentLogs: { orderBy: { acceptedAt: "desc" } },
      dataRequests: { orderBy: { requestedAt: "desc" } },
    },
  });

  if (!customer) notFound();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold uppercase">
          {customer.name ?? customer.email ?? "Customer"}
        </h1>
        <AdminBadge tone={customer.status === "ACTIVE" ? "success" : "problem"}>
          {customer.status === "ACTIVE" ? "Active" : "Suspended"}
        </AdminBadge>
      </div>
      <p className="text-sm text-onwei-blue/70">
        {customer.email ?? "No email"} · {customer.phone ?? "No phone"}
      </p>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Addresses
        </h2>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">No addresses on file.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {customer.addresses.map((address) => (
              <li key={address.id}>
                <span className="font-medium">
                  {address.type === "SHIPPING" ? "Shipping" : "Billing"}:
                </span>{" "}
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                {address.state} {address.postalCode}, {address.country}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Orders
        </h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">No orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {customer.orders.map((order) => (
              <li key={order.id} className="flex items-center gap-2">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {order.orderNumber}
                </Link>
                <AdminBadge tone={orderStatusTone(order.status)}>
                  {ORDER_STATUS_LABELS[order.status]}
                </AdminBadge>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Consent history
        </h2>
        {customer.consentLogs.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">
            No consent records on file.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {customer.consentLogs.map((log) => (
              <li key={log.id}>
                {CONSENT_TYPE_LABELS[log.consentType]} (v{log.version}) —{" "}
                {log.acceptedAt.toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Data requests
        </h2>
        {customer.dataRequests.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">
            No data requests from this customer.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {customer.dataRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-4 border-t border-onwei-beige pt-3 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {DSR_TYPE_LABELS[request.type]}
                  </p>
                  <AdminBadge tone={dsrStatusTone(request.status)}>
                    {DSR_STATUS_LABELS[request.status]}
                  </AdminBadge>
                </div>
                <DsrStatusForm
                  requestId={request.id}
                  currentStatus={request.status}
                />
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </main>
  );
}
