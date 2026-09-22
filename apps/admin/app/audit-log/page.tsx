import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminButton,
  AdminInput,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; entityId?: string }>;
}) {
  await requirePageSession("auditLog:view");
  const { entityType, entityId } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    include: { staffUser: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Audit log
      </h1>

      <form className="flex flex-wrap items-center gap-2">
        <AdminInput
          name="entityType"
          defaultValue={entityType ?? ""}
          placeholder="Entity type (e.g. Order)"
        />
        <AdminInput
          name="entityId"
          defaultValue={entityId ?? ""}
          placeholder="Entity ID"
        />
        <AdminButton type="submit" variant="secondary">
          Filter
        </AdminButton>
      </form>

      {logs.length === 0 ? (
        <p className="text-onwei-blue/70">No matching activity.</p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>When</AdminTableHeaderCell>
            <AdminTableHeaderCell>Who</AdminTableHeaderCell>
            <AdminTableHeaderCell>Action</AdminTableHeaderCell>
            <AdminTableHeaderCell>On</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {logs.map((log) => (
              <AdminTableRow key={log.id}>
                <AdminTableCell>
                  {log.createdAt.toLocaleString()}
                </AdminTableCell>
                <AdminTableCell>
                  {log.staffUser?.name ?? "System"}
                </AdminTableCell>
                <AdminTableCell className="font-mono">
                  {log.action}
                </AdminTableCell>
                <AdminTableCell>
                  {log.entityType}{" "}
                  <span className="font-mono text-xs text-onwei-blue/60">
                    ({log.entityId})
                  </span>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
