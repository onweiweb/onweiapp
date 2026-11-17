import { getSmsStats, listSmsMessages } from "@onwei/core";
import type { SmsStatus } from "@onwei/database";
import Link from "next/link";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPager,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  EmptyState,
  PageHeader,
  type StatusTone,
} from "../_components/ui";
import { MESSAGE_WHEN, after } from "../_lib/messageTiming";
import { PAGE_SIZE, parsePage } from "../_lib/pagination";
import { requirePageSession } from "../_lib/requirePageSession";

const STATUS_INFO: Record<SmsStatus, { label: string; tone: StatusTone }> = {
  SENDING: { label: "Sending", tone: "pending" },
  SENT: { label: "Sent", tone: "active" },
  DELIVERED: { label: "Delivered", tone: "success" },
  FAILED: { label: "Failed", tone: "problem" },
};

type SearchParams = { page?: string; status?: string; phone?: string };

/** Text messages (SMS) Onwei sent through MSG91, with how far each got. */
export default async function SmsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePageSession("settings:view");
  const params = await searchParams;
  const page = parsePage(params.page);
  const status =
    params.status && params.status in STATUS_INFO
      ? (params.status as SmsStatus)
      : undefined;
  const phone = (params.phone ?? "").replace(/\D/g, "").slice(-10);

  const [{ rows, hasNext }, stats] = await Promise.all([
    listSmsMessages({
      page,
      pageSize: PAGE_SIZE,
      status,
      phoneEnding: phone || undefined,
    }),
    getSmsStats(),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Text messages"
        description="Sign-in codes Onwei sends by SMS through MSG91, and whether each one reached the phone. Numbers are partly hidden and codes are never kept."
      />

      <AdminCard className="flex flex-col gap-2 py-4 text-sm text-onwei-blue/80">
        <p>
          Last 30 days: {stats.total} sent · {stats.delivered} delivered ·{" "}
          {stats.failed} failed
        </p>
        <p className="text-xs text-onwei-blue/70">
          SMS codes switch on by themselves once the MSG91 settings are added to
          the storefront. Until then, shoppers on the live site can&apos;t pick
          SMS and nothing shows here.
        </p>
        {stats.topFailure ? (
          <p className="max-w-2xl">
            Most common problem: {stats.topFailure.reason} (
            {stats.topFailure.count}).{" "}
            <Link href="/sms?status=FAILED" className="underline">
              See them
            </Link>
          </p>
        ) : null}
      </AdminCard>

      <AdminCard className="flex flex-col gap-3 py-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Status
            <AdminSelect name="status" defaultValue={status ?? ""}>
              <option value="">Any status</option>
              {Object.entries(STATUS_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Number ends with
            <AdminInput
              name="phone"
              defaultValue={phone}
              inputMode="numeric"
              placeholder="e.g. 3210"
              className="w-36"
            />
          </label>
          <AdminButton type="submit" variant="secondary">
            Filter
          </AdminButton>
        </form>
        <p className="text-xs text-onwei-blue/70">
          <strong>Sending</strong>: being handed to MSG91. <strong>Sent</strong>
          : MSG91 accepted it. <strong>Delivered</strong>: it reached the phone.{" "}
          <strong>Failed</strong>: it didn&apos;t reach the phone, the reason
          comes from MSG91 or the mobile network. Stuck on Sent for hours
          usually means the phone is off, or delivery updates aren&apos;t
          reaching us.
        </p>
      </AdminCard>

      {rows.length === 0 ? (
        <EmptyState
          title="No text messages here"
          description={
            status || phone
              ? "Nothing matches these filters."
              : "Once Onwei sends a sign-in code by SMS, it shows up here."
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTableHeaderCell>When</AdminTableHeaderCell>
            <AdminTableHeaderCell>To</AdminTableHeaderCell>
            <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          </AdminTableHead>
          <tbody>
            {rows.map((row) => {
              const info = STATUS_INFO[row.status];
              const timing =
                row.status === "DELIVERED"
                  ? after(row.createdAt, row.deliveredAt)
                  : row.status === "FAILED"
                    ? after(row.createdAt, row.failedAt)
                    : null;
              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell className="whitespace-nowrap">
                    {MESSAGE_WHEN.format(row.createdAt)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <p>{row.name ?? "Signing in"}</p>
                    <p className="text-xs text-onwei-blue/60">{row.phone}</p>
                  </AdminTableCell>
                  <AdminTableCell className="max-w-sm">
                    <AdminBadge tone={info.tone}>{info.label}</AdminBadge>
                    {timing ? (
                      <span className="ml-2 text-xs text-onwei-blue/60">
                        {timing}
                      </span>
                    ) : null}
                    {row.failureReason ? (
                      <p className="mt-1 max-w-sm whitespace-normal text-xs text-onwei-blue/70">
                        {row.failureReason}
                      </p>
                    ) : null}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      <AdminPager
        pathname="/sms"
        page={page}
        hasNext={hasNext}
        params={{ status, phone: phone || undefined }}
      />
    </main>
  );
}
