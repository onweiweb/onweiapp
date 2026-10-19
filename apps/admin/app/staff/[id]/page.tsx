import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { StaffStatusToggle } from "../../_components/StaffStatusToggle";
import { StaffRoleAssignment } from "../../_components/StaffRoleAssignment";
import { AdminBadge, AdminCard, PageHeader } from "../../_components/ui";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requirePageSession("staffUser:create");
  const { id } = await params;

  const [staffUser, allRoles] = await Promise.all([
    prisma.staffUser.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!staffUser) notFound();

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/staff", label: "Staff" }}
        title={staffUser.name}
        description={staffUser.email}
        actions={
          <AdminBadge tone={staffUser.isActive ? "success" : "problem"}>
            {staffUser.isActive ? "Active" : "Deactivated"}
          </AdminBadge>
        }
      />

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Account status
        </h2>
        <StaffStatusToggle
          staffUserId={staffUser.id}
          isActive={staffUser.isActive}
          isViewingOwnAccount={staffUser.id === viewer.staffUserId}
        />
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Roles
        </h2>
        <StaffRoleAssignment
          staffUserId={staffUser.id}
          allRoles={allRoles.map((role) => ({ id: role.id, name: role.name }))}
          assignedRoleIds={staffUser.roles.map((r) => r.roleId)}
        />
      </AdminCard>
    </main>
  );
}
