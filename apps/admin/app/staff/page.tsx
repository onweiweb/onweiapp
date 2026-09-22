import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminBadge,
  AdminButton,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

export default async function StaffPage() {
  await requirePageSession("staffUser:create");

  const staffUsers = await prisma.staffUser.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold uppercase">Staff</h1>
        <Link href="/staff/new">
          <AdminButton>Add staff</AdminButton>
        </Link>
      </div>

      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>Name</AdminTableHeaderCell>
          <AdminTableHeaderCell>Email</AdminTableHeaderCell>
          <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          <AdminTableHeaderCell>Roles</AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {staffUsers.map((staffUser) => (
            <AdminTableRow key={staffUser.id}>
              <AdminTableCell>
                <Link
                  href={`/staff/${staffUser.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {staffUser.name}
                </Link>
              </AdminTableCell>
              <AdminTableCell>{staffUser.email}</AdminTableCell>
              <AdminTableCell>
                <AdminBadge tone={staffUser.isActive ? "success" : "problem"}>
                  {staffUser.isActive ? "Active" : "Deactivated"}
                </AdminBadge>
              </AdminTableCell>
              <AdminTableCell>
                {staffUser.roles.length === 0
                  ? "—"
                  : staffUser.roles.map((r) => r.role.name).join(", ")}
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </main>
  );
}
