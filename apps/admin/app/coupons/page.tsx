import Link from "next/link";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  LinkButton,
  PageHeader,
} from "../_components/ui";

export default async function CouponsPage() {
  await requirePageSession("coupon:create");

  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { rules: true, redemptions: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Coupons"
        description="Discount codes shoppers can use at checkout."
        actions={
          <>
            <LinkButton href="/coupons/new">Add coupon</LinkButton>
          </>
        }
      />

      {coupons.length === 0 ? (
        <p className="text-onwei-blue/70">
          No coupons yet, add your first one.
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Code</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Rules</AdminTableHeaderCell>
            <AdminTableHeaderCell>Times used</AdminTableHeaderCell>
            <AdminTableHeaderCell>Usage limit</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {coupons.map((coupon) => (
              <AdminTableRow key={coupon.id}>
                <AdminTableCell>
                  <Link
                    href={`/coupons/${coupon.id}`}
                    className="font-mono font-medium underline-offset-2 hover:underline"
                  >
                    {coupon.code}
                  </Link>
                </AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={coupon.isActive ? "success" : "pending"}>
                    {coupon.isActive ? "Active" : "Inactive"}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>{coupon._count.rules}</AdminTableCell>
                <AdminTableCell>{coupon._count.redemptions}</AdminTableCell>
                <AdminTableCell>
                  {coupon.usageLimit ?? "Unlimited"}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
