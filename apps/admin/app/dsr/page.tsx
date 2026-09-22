import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import { DSR_STATUS_LABELS, DSR_TYPE_LABELS } from "../_lib/complianceLabels";
import { DsrStatusForm } from "../_components/DsrStatusForm";
import {
  AdminBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  dsrStatusTone,
} from "../_components/ui";

export default async function DsrPage() {
  await requirePageSession("dsr:view");

  const requests = await prisma.dataSubjectRequest.findMany({
    where: { status: { in: ["RECEIVED", "IN_PROGRESS"] } },
    include: { customer: true },
    orderBy: { requestedAt: "asc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Data requests
      </h1>

      {requests.length === 0 ? (
        <p className="text-onwei-blue/70">
          Nothing open — new requests will show up here.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
            <AdminTableHeaderCell>Request</AdminTableHeaderCell>
            <AdminTableHeaderCell>Requested</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {requests.map((request) => (
              <AdminTableRow key={request.id}>
                <AdminTableCell>
                  <Link
                    href={`/customers/${request.customerId}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {request.customer.name ??
                      request.customer.email ??
                      "Customer"}
                  </Link>
                </AdminTableCell>
                <AdminTableCell>{DSR_TYPE_LABELS[request.type]}</AdminTableCell>
                <AdminTableCell>
                  {request.requestedAt.toLocaleDateString()}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={dsrStatusTone(request.status)}>
                    {DSR_STATUS_LABELS[request.status]}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  <DsrStatusForm
                    requestId={request.id}
                    currentStatus={request.status}
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
