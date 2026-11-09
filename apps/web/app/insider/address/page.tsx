import type { Metadata } from "next";
import {
  INDIAN_STATES,
  getCardAddressForEntry,
  verifyInsiderLinkToken,
} from "@onwei/core";
import { InsiderHelpCard, InsiderShell } from "../_components/InsiderShell";
import { InsiderAddressFlow } from "../_components/InsiderAddressFlow";
import { INSIDER_ERRORS } from "../../../lib/messages/insider";

export const metadata: Metadata = {
  title: "Share your address | Onwei Insiders",
  robots: { index: false, follow: false },
};

// Personal page behind a signed link: never cached or prebuilt.
export const dynamic = "force-dynamic";

export default async function InsiderAddressPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token = "" } = await searchParams;
  const link = verifyInsiderLinkToken(
    "address",
    token,
    process.env.INSIDER_LINK_SECRET,
  );
  const member = link.ok ? await getCardAddressForEntry(link.entryId) : null;

  if (!member) {
    const expired = !link.ok && link.reason === "EXPIRED";
    return (
      <InsiderShell>
        <h1 className="font-display text-[length:max(2rem,26px)] font-bold uppercase leading-[1]">
          {expired ? "This link has expired." : "We couldn't open this link."}
        </h1>
        <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
          {expired ? INSIDER_ERRORS.LINK_EXPIRED : INSIDER_ERRORS.LINK_INVALID}
        </p>
      </InsiderShell>
    );
  }

  const saved = member.address;
  return (
    <InsiderShell>
      <div className="flex flex-col gap-3">
        <p className="w-fit rounded-[31.25rem] bg-onwei-blue px-3 py-1 font-grotesk text-[length:max(0.6875rem,10px)] uppercase tracking-[0.08em] text-onwei-beige">
          Onwei Insider card
        </p>
        <h1 className="font-display text-[length:max(2.25rem,28px)] font-bold uppercase leading-[0.95]">
          {member.firstName
            ? `${member.firstName}, where should we post it?`
            : "Where should we post it?"}
        </h1>
        <p className="font-grotesk text-[length:max(0.9375rem,13px)] leading-[1.5]">
          {saved
            ? "Here's the address we have. You can change it until we post your card."
            : "Your Insider Access card is ready to go. Tell us where to send it. Takes about 20 seconds."}
        </p>
      </div>

      <InsiderAddressFlow
        token={token}
        states={INDIAN_STATES}
        alreadySaved={Boolean(saved)}
        posted={Boolean(saved?.postedAt)}
        initial={{
          fullName: saved?.fullName ?? member.fullName,
          phone: saved?.phone ?? member.phone,
          line1: saved?.line1 ?? "",
          line2: saved?.line2 ?? "",
          city: saved?.city ?? "",
          state: saved?.state ?? "",
          postalCode: saved?.postalCode ?? "",
        }}
      />

      <InsiderHelpCard
        title="Why we ask"
        body="We only use this address to post your Insider card. It's never shared or used for anything else."
      />
    </InsiderShell>
  );
}
