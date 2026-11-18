import {
  getInsiderDefaultPercent,
  getInsiderStackMode,
  istDateOf,
  istLastDayOf,
  listInsiderTiers,
} from "@onwei/core";
import {
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
} from "../_components/ui";
import {
  DefaultPercentForm,
  TierActions,
  TierForm,
} from "../insiders/_components";
import { StackModeForm } from "./_components/StackModeForm";

/** Coupons and discounts > Insider discount (moved from Insiders). */
export async function InsiderDiscountTab({
  canManage,
}: {
  canManage: boolean;
}) {
  const [defaultPercent, tiers, stackMode] = await Promise.all([
    getInsiderDefaultPercent(),
    listInsiderTiers(),
    getInsiderStackMode(),
  ]);
  const rows = tiers.map((tier) => ({
    id: tier.id,
    label: tier.label,
    startDate: istDateOf(tier.startsAt),
    endDate: istLastDayOf(tier.endsAt),
    percent: tier.percent,
  }));

  return (
    <div className="flex flex-col gap-6">
      <AdminCard className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-onwei-blue">
          Insider discount
        </h2>
        {canManage ? (
          <DefaultPercentForm initial={defaultPercent} />
        ) : (
          <p className="text-sm">Every Insider gets {defaultPercent}% off.</p>
        )}
        <p className="text-xs text-onwei-blue/60">
          Changes apply to the next order an Insider places. Orders already
          placed keep the discount they got.
        </p>
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            With other offers
          </h2>
          <p className="text-sm text-onwei-blue/70">
            How the Insider discount works with coupons and the pre-order
            discount. Free delivery, free items and personal credits always go
            with it.
          </p>
        </div>
        <StackModeForm initial={stackMode} canManage={canManage} />
      </AdminCard>

      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Tiers by signup date
          </h2>
          <p className="text-sm text-onwei-blue/70">
            Optional. Give people who signed up between two dates a different
            discount, for example more for the earliest Insiders. Dates are in
            India time. Anyone outside every tier gets the discount above.
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="No tiers yet"
            description={`Every Insider gets ${defaultPercent}% off.`}
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Signed up</AdminTableHeaderCell>
              <AdminTableHeaderCell>Discount</AdminTableHeaderCell>
              {canManage ? (
                <AdminTableHeaderCell>{""}</AdminTableHeaderCell>
              ) : null}
            </AdminTableHead>
            <tbody>
              {rows.map((row) => (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>{row.label}</AdminTableCell>
                  <AdminTableCell>
                    {row.startDate} to {row.endDate}
                  </AdminTableCell>
                  <AdminTableCell>{row.percent}%</AdminTableCell>
                  {canManage ? (
                    <AdminTableCell>
                      <TierActions tier={row} />
                    </AdminTableCell>
                  ) : null}
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
        {canManage ? (
          <div className="border-t border-onwei-blue/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-onwei-blue">
              Add a tier
            </h3>
            <TierForm />
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}
