import { notFound } from "next/navigation";
import { formatCurrency, loadCouponDraft } from "@onwei/core";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import { CouponBuilder } from "../../_components/CouponBuilder";
import {
  AdminBadge,
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  PageHeader,
} from "../../_components/ui";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession("coupon:create");
  const { id } = await params;
  const loaded = await loadCouponDraft(id);
  if (!loaded) notFound();

  const [categories, products, recent] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.couponRedemption.findMany({
      where: { couponId: id },
      orderBy: { redeemedAt: "desc" },
      take: 50,
      include: { order: { select: { id: true, orderNumber: true } } },
    }),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/coupons", label: "Coupons" }}
        title={`Coupon ${loaded.draft.code}`}
        description={`${loaded.uses.confirmed} used${loaded.uses.held ? `, ${loaded.uses.held} held in open checkouts` : ""}.`}
        actions={
          <AdminBadge tone={loaded.draft.isActive ? "success" : "problem"}>
            {loaded.draft.isActive ? "On" : "Off"}
          </AdminBadge>
        }
      />
      <CouponBuilder
        couponId={id}
        initial={loaded.draft}
        locked={loaded.locked}
        uses={loaded.uses}
        categories={categories}
        products={products}
      />
      <AdminCard>
        <h2 className="mb-3 text-lg font-semibold text-onwei-blue">
          Latest uses
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-onwei-blue/70">Not used yet.</p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Order</AdminTableHeaderCell>
              <AdminTableHeaderCell>Discount</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>When</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {recent.map((r) => (
                <AdminTableRow key={r.id}>
                  <AdminTableCell>
                    <a
                      href={`/orders/${r.order.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {r.order.orderNumber}
                    </a>
                  </AdminTableCell>
                  <AdminTableCell>
                    {formatCurrency(Math.round(Number(r.discountAmount) * 100))}
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.status === "CONFIRMED"
                      ? "Used"
                      : r.status === "RESERVED"
                        ? "Held (unpaid)"
                        : "Given back"}
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.redeemedAt.toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>
    </main>
  );
}
