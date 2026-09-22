import { notFound } from "next/navigation";
import { prisma } from "@onwei/database";
import { requirePageSession } from "../../_lib/requirePageSession";
import {
  DISCOUNT_TYPE_LABELS,
  describeDiscountRule,
} from "../../_lib/discountLabels";
import { CouponForm } from "../../_components/CouponForm";
import { DiscountRuleForm } from "../../_components/DiscountRuleForm";
import {
  AdminBadge,
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../../_components/ui";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession("coupon:create");
  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      rules: { orderBy: { priority: "desc" } },
      redemptions: { include: { customer: true, order: true } },
    },
  });

  if (!coupon) notFound();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold uppercase">
          {coupon.code}
        </h1>
        <AdminBadge tone={coupon.isActive ? "success" : "pending"}>
          {coupon.isActive ? "Active" : "Inactive"}
        </AdminBadge>
      </div>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Details
        </h2>
        <CouponForm
          mode="edit"
          couponId={coupon.id}
          initial={{
            code: coupon.code,
            description: coupon.description ?? "",
            usageLimit: coupon.usageLimit?.toString() ?? "",
            perCustomerLimit: coupon.perCustomerLimit?.toString() ?? "",
            minOrderValue: coupon.minOrderValue?.toString() ?? "",
            isActive: coupon.isActive,
          }}
        />
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Discount rules
        </h2>
        {coupon.rules.length === 0 ? (
          <p className="mb-3 text-sm text-onwei-blue/60">
            No rules yet — add one below so this code actually discounts
            something.
          </p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {coupon.rules.map((rule) => (
              <li key={rule.id} className="text-sm">
                <span className="font-medium">
                  {DISCOUNT_TYPE_LABELS[rule.type]}:
                </span>{" "}
                {describeDiscountRule(
                  rule.type,
                  rule.config as Record<string, unknown>,
                )}
                {rule.stackable ? (
                  <span className="ml-2 text-xs text-onwei-blue/60">
                    (stacks with other rules)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <DiscountRuleForm couponId={coupon.id} />
      </AdminCard>

      <AdminCard>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase text-onwei-blue/70">
          Redemptions
        </h2>
        {coupon.redemptions.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">
            No redemptions yet — this will fill in once a customer uses this
            code at checkout.
          </p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Order</AdminTableHeaderCell>
              <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
              <AdminTableHeaderCell>Discount</AdminTableHeaderCell>
              <AdminTableHeaderCell>Redeemed</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {coupon.redemptions.map((redemption) => (
                <AdminTableRow key={redemption.id}>
                  <AdminTableCell>
                    {redemption.order.orderNumber}
                  </AdminTableCell>
                  <AdminTableCell>
                    {redemption.customer.name ??
                      redemption.customer.email ??
                      "—"}
                  </AdminTableCell>
                  <AdminTableCell>
                    {redemption.discountAmount.toString()}
                  </AdminTableCell>
                  <AdminTableCell>
                    {redemption.redeemedAt.toLocaleDateString()}
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
