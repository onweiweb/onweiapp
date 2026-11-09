import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  INDIAN_STATES,
  getAccountSummary,
  listAddresses,
  listCustomerOrders,
} from "@onwei/core";
import { ProductImage } from "@/_components/ProductImage";
import { getSession } from "../../lib/session";
import { ORDER_STATUS_LABELS, rupees } from "../../lib/messages/commerce";
import { CheckoutShell } from "../checkout/_components/CheckoutShell";
import { Card } from "../checkout/_components/parts";
import {
  AddContact,
  AddressBook,
  NameEditor,
  SignOutButton,
} from "./AccountClient";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// No Figma frame: built in the checkout frames' style (approved 2026-11-09).
const TABS = [
  { id: "orders", label: "Orders" },
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
] as const;

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const account = await getAccountSummary(session.customerId);
  if (!account) redirect("/login?next=/account");
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "orders";
  const first = account.name?.split(/\s+/)[0];

  return (
    <CheckoutShell>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-script text-[length:max(1.25rem,16px)] uppercase">
              On the Wei
            </p>
            <h1 className="font-display text-[length:max(3rem,34px)] font-bold uppercase leading-[0.95]">
              {first ? `Hey, ${first}` : "Your account"}
            </h1>
          </div>
          <SignOutButton />
        </div>

        {account.insider ? (
          <div className="flex flex-col gap-4 rounded-[1.5rem] bg-onwei-purple p-6 text-onwei-beige desk:flex-row desk:items-center desk:justify-between">
            <div>
              <p className="w-fit rounded-full bg-onwei-blue px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.08em]">
                Onwei Insider
              </p>
              <p className="mt-3 font-display text-[length:max(1.5rem,20px)] font-bold uppercase leading-none text-onwei-blue">
                {account.insider.percent}% off every order
              </p>
              <p className="mt-1 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue">
                Applies by itself at checkout.{" "}
                {account.insider.cardPostedAt
                  ? "Your Insider card is in the post."
                  : account.insider.hasCardAddress
                    ? "Your Insider card is on its way soon."
                    : ""}
              </p>
            </div>
            <p className="w-fit rounded-[0.875rem] border-2 border-dashed border-onwei-blue bg-onwei-beige px-6 py-3 font-grotesk text-[length:max(1.5rem,20px)] font-bold tracking-[0.3em] text-onwei-blue">
              {account.insider.code}
            </p>
          </div>
        ) : null}

        <nav aria-label="Account sections" className="flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/account?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={`rounded-full px-5 py-2 font-grotesk text-[length:max(0.75rem,11px)] uppercase ${t.id === tab ? "bg-onwei-blue text-onwei-beige" : "border border-onwei-blue"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === "orders" ? <Orders customerId={session.customerId} /> : null}
        {tab === "profile" ? (
          <Card className="flex max-w-[40rem] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                Name
              </p>
              <NameEditor initial={account.name} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                Email
              </p>
              {account.email && account.emailVerified ? (
                <p className="font-grotesk">
                  {account.email}{" "}
                  <span className="text-[0.75rem]">✓ verified</span>
                </p>
              ) : (
                <AddContact kind="email" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.06em]">
                Mobile number
              </p>
              {account.phone && account.phoneVerified ? (
                <p className="font-grotesk">
                  {account.phone}{" "}
                  <span className="text-[0.75rem]">✓ verified</span>
                </p>
              ) : (
                <AddContact kind="phone" />
              )}
            </div>
            <p className="font-grotesk text-[length:max(0.75rem,11px)]">
              Want a copy of your data or your account deleted? Write to{" "}
              <a className="underline" href="mailto:admin@onwei.in">
                admin@onwei.in
              </a>
              .
            </p>
          </Card>
        ) : null}
        {tab === "addresses" ? (
          <Card className="max-w-[48rem]">
            <AddressBook
              initial={await listAddresses(session.customerId)}
              states={INDIAN_STATES}
            />
          </Card>
        ) : null}
      </div>
    </CheckoutShell>
  );
}

async function Orders({ customerId }: { customerId: string }) {
  const orders = await listCustomerOrders(customerId);
  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="font-display text-[length:max(1.25rem,16px)] font-bold">
          No orders yet.
        </p>
        <p className="font-grotesk">
          When you order, you&apos;ll be able to track it here.
        </p>
        <Link
          href="/collection/all"
          className="rounded-full bg-onwei-blue px-6 py-3 font-grotesk text-[length:max(0.8125rem,11px)] uppercase text-onwei-beige"
        >
          Start shopping
        </Link>
      </Card>
    );
  }
  const current = orders.filter((o) => o.isCurrent);
  const past = orders.filter((o) => !o.isCurrent);
  const list = (items: typeof orders) => (
    <ul className="flex flex-col gap-3">
      {items.map((order) => (
        <li key={order.orderNumber}>
          <Link
            href={`/account/orders/${order.orderNumber}`}
            className="flex items-center gap-4 rounded-[1.25rem] border border-onwei-blue bg-onwei-white p-4 hover:bg-onwei-beige"
          >
            <span className="relative size-16 shrink-0 overflow-hidden rounded-[0.75rem] bg-onwei-green">
              <ProductImage
                src={order.firstItem?.imageUrl ?? undefined}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[length:max(1rem,13px)] font-bold">
                #{order.orderNumber}
              </span>
              <span className="block font-grotesk text-[length:max(0.75rem,11px)]">
                {DATE.format(order.placedAt)} · {order.itemCount} item
                {order.itemCount === 1 ? "" : "s"} · {rupees(order.total)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase ${order.awaitingPayment ? "bg-onwei-blue text-onwei-beige" : "bg-onwei-green"}`}
            >
              {order.awaitingPayment
                ? "Finish payment"
                : ORDER_STATUS_LABELS[order.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex flex-col gap-8">
      {current.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[length:max(1.5rem,20px)] font-bold uppercase">
            On the way
          </h2>
          {list(current)}
        </section>
      ) : null}
      {past.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[length:max(1.5rem,20px)] font-bold uppercase">
            Past orders
          </h2>
          {list(past)}
        </section>
      ) : null}
    </div>
  );
}
