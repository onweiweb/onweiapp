import {
  listGiftableItems,
  listInviteRewardRules,
  listTopInviters,
} from "@onwei/core";
import {
  AdminCard,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "../_components/ui";
import { RewardRules } from "./_rewardsClient";

/**
 * Insiders > Invite rewards: "invite N people, get X" rules, and who has let
 * the most people in. A reward is a personal coupon, sent by email when the
 * member's Nth invitee becomes an Insider.
 */
export async function RewardsTab({ canManage }: { canManage: boolean }) {
  const [rules, items, top] = await Promise.all([
    listInviteRewardRules(),
    listGiftableItems(),
    listTopInviters(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Rewards for inviting
          </h2>
          <p className="text-sm text-onwei-blue/70">
            An invite counts when the person becomes an Insider (straight away
            with an Insider&apos;s number, or when you approve their
            application). Each reward is given once per member, as a code only
            they can use, and emailed to them.
          </p>
        </div>
        <RewardRules
          canManage={canManage}
          rules={rules}
          items={items.map((i) => ({ id: i.id, name: i.name, stock: i.stock }))}
        />
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-onwei-blue">Top inviters</h2>
        {top.length === 0 ? (
          <p className="text-sm text-onwei-blue/70">
            Nobody has let anyone in yet.
          </p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Insider</AdminTableHeaderCell>
              <AdminTableHeaderCell>Insider ID</AdminTableHeaderCell>
              <AdminTableHeaderCell>People let in</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {top.map((t) => (
                <AdminTableRow key={t.entryId}>
                  <AdminTableCell>{t.name}</AdminTableCell>
                  <AdminTableCell>{t.insiderCode ?? "-"}</AdminTableCell>
                  <AdminTableCell>{t.invites}</AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
