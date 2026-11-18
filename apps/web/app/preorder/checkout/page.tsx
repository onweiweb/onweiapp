import type { Metadata } from "next";
import { INDIAN_STATES, getAccountSummary, listAddresses } from "@onwei/core";
import { getSession } from "../../../lib/session";
import { CheckoutShell } from "../../checkout/_components/CheckoutShell";
import { PreorderFlow } from "./PreorderFlow";

export const metadata: Metadata = {
  title: "Reserve",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Reserve a pre-order: one product, paid separately from the bag. No Figma
// frame; built in the checkout frames' style (approved 2026-11-09).
export default async function PreorderCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; q?: string }>;
}) {
  const [session, { v, q }] = await Promise.all([getSession(), searchParams]);
  const [account, addresses] = await Promise.all([
    session ? getAccountSummary(session.customerId) : Promise.resolve(null),
    session ? listAddresses(session.customerId) : Promise.resolve([]),
  ]);
  const quantity = Math.min(
    10,
    Math.max(1, Number.parseInt(q ?? "1", 10) || 1),
  );

  return (
    <CheckoutShell>
      <PreorderFlow
        variantId={(v ?? "").slice(0, 64)}
        initialQuantity={quantity}
        signedIn={Boolean(account)}
        account={
          account
            ? {
                name: account.name,
                email: account.emailVerified ? account.email : null,
                phone: account.phoneVerified ? account.phone : null,
              }
            : null
        }
        initialAddresses={addresses}
        states={INDIAN_STATES}
      />
    </CheckoutShell>
  );
}
