import type { Metadata } from "next";
import {
  INDIAN_STATES,
  getAccountSummary,
  getStoreSettings,
  listAddresses,
} from "@onwei/core";
import { getSession } from "../../lib/session";
import { CheckoutShell } from "./_components/CheckoutShell";
import { CheckoutFlow } from "./_components/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const [session, { pay }] = await Promise.all([getSession(), searchParams]);
  const [account, addresses, settings] = await Promise.all([
    session ? getAccountSummary(session.customerId) : Promise.resolve(null),
    session ? listAddresses(session.customerId) : Promise.resolve([]),
    getStoreSettings(),
  ]);

  return (
    <CheckoutShell>
      <CheckoutFlow
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
        preferCod={pay === "cod"}
        states={INDIAN_STATES}
        cod={{
          enabled: settings.codEnabled,
          fee: settings.codFee,
          min: settings.codMinOrder,
          max: settings.codMaxOrder,
        }}
      />
    </CheckoutShell>
  );
}
