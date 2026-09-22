import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminBadge,
  AdminButton,
  AdminInput,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageSession("customer:view");
  const { q } = await searchParams;
  const query = q?.trim();

  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold uppercase">
          Customers
        </h1>
        <form className="flex items-center gap-2">
          <AdminInput
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search by name, email, or phone"
          />
          <AdminButton type="submit" variant="secondary">
            Search
          </AdminButton>
        </form>
      </div>

      {customers.length === 0 ? (
        <p className="text-onwei-blue/70">No customers match that search.</p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Name</AdminTableHeaderCell>
            <AdminTableHeaderCell>Email</AdminTableHeaderCell>
            <AdminTableHeaderCell>Phone</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {customers.map((customer) => (
              <AdminTableRow key={customer.id}>
                <AdminTableCell>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {customer.name ?? "—"}
                  </Link>
                </AdminTableCell>
                <AdminTableCell>{customer.email ?? "—"}</AdminTableCell>
                <AdminTableCell>{customer.phone ?? "—"}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge
                    tone={customer.status === "ACTIVE" ? "success" : "problem"}
                  >
                    {customer.status === "ACTIVE" ? "Active" : "Suspended"}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  {customer.createdAt.toLocaleDateString()}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
