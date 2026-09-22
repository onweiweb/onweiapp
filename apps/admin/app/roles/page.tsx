import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminButton,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

export default async function RolesPage() {
  await requirePageSession("role:create");

  const roles = await prisma.role.findMany({
    include: { _count: { select: { permissions: true, staffUsers: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold uppercase">Roles</h1>
        <Link href="/roles/new">
          <AdminButton>Add role</AdminButton>
        </Link>
      </div>

      {roles.length === 0 ? (
        <p className="text-onwei-blue/70">
          No roles yet — add one, then assign it to a staff account.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Name</AdminTableHeaderCell>
            <AdminTableHeaderCell>Description</AdminTableHeaderCell>
            <AdminTableHeaderCell>Permissions</AdminTableHeaderCell>
            <AdminTableHeaderCell>Staff assigned</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {roles.map((role) => (
              <AdminTableRow key={role.id}>
                <AdminTableCell>
                  <Link
                    href={`/roles/${role.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {role.name}
                  </Link>
                </AdminTableCell>
                <AdminTableCell>{role.description ?? "—"}</AdminTableCell>
                <AdminTableCell>{role._count.permissions}</AdminTableCell>
                <AdminTableCell>{role._count.staffUsers}</AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
