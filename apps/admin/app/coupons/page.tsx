import Link from "next/link";
import {
  formatCurrency,
  listCouponsForAdmin,
  type CouponState,
} from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import {
  AdminBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  LinkButton,
  PageHeader,
  type StatusTone,
} from "../_components/ui";

const STATE: Record<CouponState, { label: string; tone: StatusTone }> = {
  LIVE: { label: "Live", tone: "success" },
  SCHEDULED: { label: "Starts later", tone: "pending" },
  ENDED: { label: "Ended", tone: "problem" },
  OFF: { label: "Off", tone: "problem" },
  USED_UP: { label: "Used up", tone: "problem" },
};

export default async function CouponsPage() {
  await requirePageSession("coupon:create");
  const coupons = await listCouponsForAdmin();

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Coupons"
        description="Discount codes and automatic offers. The Insider discount is set on the Insiders page."
        actions={<LinkButton href="/coupons/new">Add coupon</LinkButton>}
      />
      {coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          description="Create one to give customers a code at checkout."
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>Code</AdminTableHeaderCell>
            <AdminTableHeaderCell>Gives</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
            <AdminTableHeaderCell>Used</AdminTableHeaderCell>
            <AdminTableHeaderCell>Given away</AdminTableHeaderCell>
            <AdminTableHeaderCell>Ends</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {coupons.map((c) => (
              <AdminTableRow key={c.id}>
                <AdminTableCell>
                  <Link
                    href={`/coupons/${c.id}`}
                    className="font-mono font-semibold underline-offset-2 hover:underline"
                  >
                    {c.code}
                  </Link>
                  {c.autoApply ? (
                    <span className="block text-xs text-onwei-blue/60">
                      Applies by itself
                    </span>
                  ) : null}
                </AdminTableCell>
                <AdminTableCell>{c.summary}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge tone={STATE[c.state].tone}>
                    {STATE[c.state].label}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  {c.uses}
                  {c.usageLimit !== null ? ` of ${c.usageLimit}` : ""}
                </AdminTableCell>
                <AdminTableCell>
                  {formatCurrency(c.totalDiscount)}
                </AdminTableCell>
                <AdminTableCell>
                  {c.endsAt
                    ? c.endsAt.toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })
                    : "-"}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </tbody>
        </AdminTable>
      )}
    </main>
  );
}
