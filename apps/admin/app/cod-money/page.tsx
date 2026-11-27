import Link from "next/link";
import { hasPermission } from "@onwei/auth";
import {
  formatCurrency,
  istDateOf,
  listCodPayouts,
  listUnpaidCodOrders,
  readIthinkConfig,
} from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";
import { pageWindow, parsePage, trimPage } from "../_lib/pagination";
import {
  AdminPager,
  AdminTabLinks,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  PageHeader,
} from "../_components/ui";
import { ImportCodButton } from "./_import";

const TABS = [
  { id: "waiting", label: "Not paid yet" },
  { id: "payouts", label: "Payouts" },
] as const;

export default async function CodMoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const staff = await requirePageSession("order:view");
  const canImport = hasPermission(staff.permissions, "order:updateStatus");
  const params = await searchParams;
  const tab = params.tab === "payouts" ? "payouts" : "waiting";
  const page = parsePage(params.page);
  const connected = readIthinkConfig() !== null;

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="COD money"
        description="iThink collects cash on delivery and pays it into your bank in payouts. Press Update from iThink to read the payouts of the last 14 days: each cash on delivery order is marked as paid out, and an amount that doesn't match is flagged on the order."
        actions={canImport && connected ? <ImportCodButton /> : undefined}
      />
      {!connected ? (
        <p className="text-sm text-onwei-blue/70">
          iThink isn&apos;t connected on this site, so payouts can&apos;t be
          read from here.
        </p>
      ) : null}
      <AdminTabLinks basePath="/cod-money" tabs={TABS} active={tab} />
      {tab === "waiting" ? <Waiting page={page} /> : <Payouts page={page} />}
    </main>
  );
}

async function Waiting({ page }: { page: number }) {
  const { rows, hasNext } = trimPage(
    await listUnpaidCodOrders(pageWindow(page)),
  );
  if (rows.length === 0 && page === 1) {
    return (
      <EmptyState
        title="Nothing waiting"
        description="Delivered cash on delivery orders show here until iThink pays them out."
      />
    );
  }
  return (
    <>
      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>Order</AdminTableHeaderCell>
          <AdminTableHeaderCell>Cash collected</AdminTableHeaderCell>
          <AdminTableHeaderCell>Delivered</AdminTableHeaderCell>
          <AdminTableHeaderCell>Waiting</AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {rows.map((r) => (
            <AdminTableRow key={r.id}>
              <AdminTableCell>
                <Link
                  href={`/orders/${r.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {r.orderNumber}
                </Link>
              </AdminTableCell>
              <AdminTableCell>{formatCurrency(r.total)}</AdminTableCell>
              <AdminTableCell>
                {r.deliveredAt ? istDateOf(r.deliveredAt) : "Not known"}
              </AdminTableCell>
              <AdminTableCell>
                {r.daysSinceDelivery === null
                  ? ""
                  : `${r.daysSinceDelivery} ${r.daysSinceDelivery === 1 ? "day" : "days"}`}
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
      <AdminPager
        pathname="/cod-money"
        page={page}
        hasNext={hasNext}
        params={{ tab: "waiting" }}
      />
    </>
  );
}

async function Payouts({ page }: { page: number }) {
  const { rows, hasNext } = trimPage(await listCodPayouts(pageWindow(page)));
  if (rows.length === 0 && page === 1) {
    return (
      <EmptyState
        title="No payouts read yet"
        description="Press Update from iThink to read the last 14 days."
      />
    );
  }
  return (
    <>
      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>Paid on</AdminTableHeaderCell>
          <AdminTableHeaderCell>iThink payout</AdminTableHeaderCell>
          <AdminTableHeaderCell>Cash collected</AdminTableHeaderCell>
          <AdminTableHeaderCell>Taken off</AdminTableHeaderCell>
          <AdminTableHeaderCell>Paid to you</AdminTableHeaderCell>
          <AdminTableHeaderCell>Orders</AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {rows.map((r) => (
            <AdminTableRow key={r.id}>
              <AdminTableCell>{istDateOf(r.remittanceDate)}</AdminTableCell>
              <AdminTableCell>{r.remittanceId}</AdminTableCell>
              <AdminTableCell>{formatCurrency(r.codGenerated)}</AdminTableCell>
              <AdminTableCell>{formatCurrency(r.deductions)}</AdminTableCell>
              <AdminTableCell className="font-medium">
                {formatCurrency(r.codRemitted)}
              </AdminTableCell>
              <AdminTableCell>{r.orders}</AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
      <AdminPager
        pathname="/cod-money"
        page={page}
        hasNext={hasNext}
        params={{ tab: "payouts" }}
      />
    </>
  );
}
