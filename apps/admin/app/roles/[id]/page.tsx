import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { RolePermissionChecklist } from "../../_components/RolePermissionChecklist";
import { AdminCard } from "../../_components/ui";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession("role:update");
  const { id } = await params;

  const [role, allPermissions] = await Promise.all([
    prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
  ]);

  if (!role) notFound();

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase">
          {role.name}
        </h1>
        {role.description ? (
          <p className="text-sm text-onwei-blue/70">{role.description}</p>
        ) : null}
      </div>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Permissions
        </h2>
        <RolePermissionChecklist
          roleId={role.id}
          allPermissionKeys={allPermissions.map((p) => p.key)}
          initialKeys={role.permissions.map((rp) => rp.permission.key)}
        />
      </AdminCard>
    </main>
  );
}
